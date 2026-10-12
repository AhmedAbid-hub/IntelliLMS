"""Institute and membership management API."""
import csv
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Count
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_field
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from apps.academics.serializers import TenantSerializer
from apps.insights.models import Audit
from .configuration import validate_grading_rules, validate_terminology
from .contracts import (
    InvitationInput,
    AttachInput,
    CsvImportInput,
    CsvImportResult,
    payload,
)
from .invitations import (
    send_invitation,
    invitation_status,
    InvitationStatus,
)
from .lifecycle import (
    TransitionInput,
    ReplaceHeadInput,
    ImpactResult,
    transition,
    replace_head,
)
from .models import Institute, Membership, User
from .scope import Scope
# ---------------------------------------------------------------------------
# Institute settings
# ---------------------------------------------------------------------------
class InstituteSerializer(serializers.ModelSerializer):
    def validate_grading_rules(self, value):
        return validate_grading_rules(value)
    def validate_terminology(self, value):
        return validate_terminology(value)
    class Meta:
        model = Institute
        fields = "__all__"
class InstituteViewSet(viewsets.ModelViewSet):
    serializer_class = InstituteSerializer
    search_fields = ["name", "code"]
    INSTITUTE_ADMIN_EDITABLE_FIELDS = frozenset({
        "name",
        "terminology",
        "grading_rules",
    })
    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Institute.objects.none()
        if self.request.user.is_superuser:
            return Institute.objects.all().order_by("name")
        return (
            Institute.objects.filter(
                membership__user=self.request.user,
                membership__active=True,
                active=True,
            )
            .distinct()
            .order_by("name")
        )
    @extend_schema(responses=None)
    @action(detail=True, methods=["get"])
    def overview(self, request, pk=None):
        if not request.user.is_superuser:
            raise PermissionDenied()
        institute = self.get_object()
        from apps.academics.models import Offering, Enrollment
        people = Membership.objects.filter(
            institute=institute,
            active=True,
        )
        role_counts = {
            row["role"]: row["total"]
            for row in people.values("role").annotate(total=Count("id"))
        }
        return Response({
            "institute": self.get_serializer(institute).data,
            "roles": role_counts,
            "courses": Offering.objects.filter(
                institute=institute,
                archived=False,
            ).count(),
            "enrollments": Enrollment.objects.filter(
                institute=institute,
                active=True,
            ).count(),
        })
    @action(detail=True, methods=["get"])
    def administrators(self, request, pk=None):
        if not request.user.is_superuser:
            raise PermissionDenied()
        institute = self.get_object()
        queryset = (
            Membership.objects.filter(
                institute=institute,
                role="admin",
            )
            .select_related("user")
            .order_by("user__username", "pk")
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(
                MembershipSerializer(page, many=True).data
            )
        return Response(
            MembershipSerializer(queryset, many=True).data
        )
    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            raise PermissionDenied(
                "Only Super Admin can create institutes."
            )
        serializer.save()
    @transaction.atomic
    def perform_update(self, serializer):
        request = self.request
        user = request.user
        if not user.is_superuser:
            scope = Scope(request)
            if scope.role != "admin":
                raise PermissionDenied(
                    "Only Institute Administrators can update institute settings."
                )
            scope.require("admin")
            if serializer.instance.pk != scope.institute.pk:
                raise PermissionDenied(
                    "You can only update settings for your own institute."
                )
            requested_fields = set(request.data.keys())
            forbidden_fields = (
                requested_fields - self.INSTITUTE_ADMIN_EDITABLE_FIELDS
            )
            if forbidden_fields:
                raise PermissionDenied(
                    "Institute Administrators may update only the "
                    "institute name, academic terminology, and grading rules."
                )
            validated_fields = set(serializer.validated_data)
            if (
                validated_fields
                - self.INSTITUTE_ADMIN_EDITABLE_FIELDS
            ):
                raise PermissionDenied(
                    "Platform-managed institute fields cannot be changed."
                )
        previous_values = {
            field: getattr(serializer.instance, field)
            for field in serializer.validated_data
        }
        institute = serializer.save()
        changed_fields = [
            field
            for field, previous in previous_values.items()
            if previous != getattr(institute, field)
        ]
        if changed_fields:
            Audit.objects.create(
                institute=institute,
                actor=user,
                action="Institute.update",
                object_id=str(institute.pk),
                detail={
                    "fields": changed_fields,
                },
            )
    def perform_destroy(self, instance):
        raise ValidationError(
            "Deactivate institutes to preserve academic records."
        )
# ---------------------------------------------------------------------------
# Membership serialization
# ---------------------------------------------------------------------------
class MembershipSerializer(TenantSerializer):
    invitation = serializers.SerializerMethodField()
    @extend_schema_field(InvitationStatus)
    def get_invitation(self, obj):
        return invitation_status(obj.user)
    avatar_url = serializers.SerializerMethodField()
    @extend_schema_field(
        serializers.CharField(allow_null=True)
    )
    def get_avatar_url(self, obj):
        if not obj.user.avatar:
            return None
        filename = obj.user.avatar.name.rsplit("/", 1)[-1]
        return (
            f"/api/v1/memberships/{obj.pk}/avatar/"
            f"?v={filename}"
        )
    username = serializers.CharField(
        source="user.username",
        read_only=True,
    )
    first_name = serializers.CharField(
        source="user.first_name",
        read_only=True,
    )
    last_name = serializers.CharField(
        source="user.last_name",
        read_only=True,
    )
    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )
    class Meta:
        model = Membership
        fields = "__all__"
        read_only_fields = [
            "institute",
            "user",
            "removed_at",
            "can_teach",
        ]
        validators = []
    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context["request"]
        is_platform_admin = request.user.is_superuser
        scope = None if is_platform_admin else Scope(request)
        instance = self.instance
        role = attrs.get(
            "role",
            getattr(instance, "role", None),
        )
        if is_platform_admin and role != "admin":
            raise PermissionDenied(
                "Platform access manages Institute Admin memberships only."
            )
        identifier = attrs.get(
            "student_identifier",
            getattr(instance, "student_identifier", ""),
        )
        if identifier:
            duplicate = (
                Membership.objects.filter(
                    institute=(instance.institute if is_platform_admin and instance else scope.institute),
                    student_identifier=identifier,
                )
                .exclude(pk=getattr(instance, "pk", None))
                .exists()
            )
            if duplicate:
                raise ValidationError({
                    "student_identifier":
                        "This student ID already exists in this institute."
                })
        if instance:
            if (
                instance.role == "student"
                and "section" in attrs
                and attrs["section"] != instance.section
            ):
                raise ValidationError(
                    "Use Student placement transfer to preserve "
                    "academic history."
                )
            lifecycle_fields = [
                "role",
                "active",
                "unit",
                "can_teach",
                "removed_at",
            ]
            for name in lifecycle_fields:
                if (
                    name in attrs
                    and attrs[name] != getattr(instance, name)
                ):
                    raise ValidationError(
                        "Use the membership lifecycle action to "
                        "review consequences and record a reason."
                    )
        elif role == "admin" and not is_platform_admin:
            raise PermissionDenied(
                "Only Super Admin can appoint Institute Admins."
            )
        unit = attrs.get(
            "unit",
            getattr(instance, "unit", None),
        )
        section = attrs.get("section")
        if section:
            expected_unit_id = getattr(unit, "pk", None)
            if section.program.unit_id != expected_unit_id:
                raise ValidationError({
                    "section":
                        "Section must match the membership department."
                })
        eligible_units = attrs.get("eligible_units")
        if eligible_units and role not in ["teacher", "head"]:
            raise ValidationError({
                "eligible_units":
                    "Teaching eligibility applies to teachers "
                    "or teaching heads only."
            })
        if eligible_units is not None and len(eligible_units) > 50:
            raise ValidationError({
                "eligible_units":
                    "Select at most 50 eligible departments."
            })
        if instance and eligible_units is not None:
            allowed = {
                value.pk
                for value in eligible_units
            }
            if unit is not None:
                allowed.add(unit.pk)
            active_outside_allowed = (
                instance.appointments.filter(active=True)
                .exclude(unit_id__in=allowed)
                .exists()
            )
            if active_outside_allowed:
                raise ValidationError(
                    "End affected departmental appointments before "
                    "removing teaching eligibility."
                )
        if role == "head" and not unit:
            raise ValidationError({
                "unit":
                    "Department heads require an academic unit."
            })
        membership_active = attrs.get(
            "active",
            getattr(instance, "active", True),
        )
        if role == "head" and membership_active:
            existing_head = (
                Membership.objects.filter(
                    institute=(instance.institute if is_platform_admin and instance else scope.institute),
                    unit=unit,
                    role="head",
                    active=True,
                )
                .exclude(pk=getattr(instance, "pk", None))
                .exists()
            )
            if existing_head:
                raise ValidationError(
                    "Use Replace Department Head to change "
                    "existing department leadership."
                )
        return attrs
# ---------------------------------------------------------------------------
# Membership management
# ---------------------------------------------------------------------------
class MembershipViewSet(viewsets.ModelViewSet):
    serializer_class = MembershipSerializer
    search_fields = [
        "user__username",
        "user__first_name",
        "user__last_name",
        "user__email",
        "display_name",
        "student_identifier",
    ]
    filterset_fields = [
        "role",
        "unit",
        "active",
        "section",
    ]
    http_method_names = [
        "get",
        "post",
        "patch",
        "head",
        "options",
    ]
    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Membership.objects.none()
        scope = Scope(self.request)
        related = [
            "user",
            "user__invitation",
            "unit",
            "section",
        ]
        if self.request.user.is_superuser:
            queryset = Membership.objects.filter(role="admin")
        elif scope.role == "admin":
            queryset = Membership.objects.filter(
                institute=scope.institute,
            )
        else:
            queryset = scope.people()
        return (
            queryset
            .select_related(*related)
            .prefetch_related("eligible_units")
            .order_by("user__username")
        )
    @extend_schema(
        responses={(200, "image/jpeg"): OpenApiTypes.BINARY}
    )
    @action(detail=True, methods=["get"])
    def avatar(self, request, pk=None):
        from .profile import avatar_response
        return avatar_response(self.get_object().user)
    @extend_schema(
        request=None,
        responses=InvitationStatus,
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="resend-invitation",
    )
    @transaction.atomic
    def resend_invitation(self, request, pk=None):
        scope = Scope(request)
        scope.require("admin")
        member = self.get_object()
        if scope.role == "admin" and member.role == "admin":
            raise PermissionDenied(
                "Institute Admin invitations are managed by Super Admin."
            )
        if not member.active or not member.user.is_active:
            raise ValidationError(
                "Reactivate the membership/account before inviting it."
            )
        status = invitation_status(member.user)
        if status["state"] == "accepted":
            raise ValidationError(
                "This invitation was accepted. "
                "The user can request a password reset."
            )
        if (
            status["state"] == "existing_account"
            and member.user.has_usable_password()
        ):
            raise ValidationError(
                "This is an existing account. "
                "The user can request a password reset."
            )
        transaction.on_commit(
            lambda: send_invitation(member.user)
        )
        Audit.objects.create(
            institute=scope.institute,
            actor=request.user,
            action="Membership.resend_invitation",
            object_id=str(member.pk),
        )
        return Response(invitation_status(member.user))
    @extend_schema(responses=ImpactResult)
    @action(detail=True, methods=["get"])
    def impact(self, request, pk=None):
        scope = Scope(request)
        scope.require("admin")
        member = self.get_object()
        courses = (
            member.user.teaching.filter(
                institute=scope.institute,
                archived=False,
            )
            .order_by("title", "pk")
        )
        active_enrollments = (
            member.user.enrollment_set.filter(
                institute=scope.institute,
                active=True,
            )
            .count()
        )
        return Response({
            "active_assignments": courses.count(),
            "courses": list(
                courses.values("id", "title")[:50]
            ),
            "preview_limit": 50,
            "active_enrollments": active_enrollments,
            "history_preserved": True,
        })
    @extend_schema(
        request=TransitionInput,
        responses=MembershipSerializer,
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="transition",
    )
    def lifecycle_transition(self, request, pk=None):
        member = self.get_object()
        values = payload(
            TransitionInput,
            request.data,
        )
        updated = transition(
            request,
            member.pk,
            values,
        )
        return Response(
            self.get_serializer(updated).data
        )
    @extend_schema(
        request=ReplaceHeadInput,
        responses=MembershipSerializer,
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="replace-head",
    )
    def leadership_replacement(self, request, pk=None):
        member = self.get_object()
        values = payload(
            ReplaceHeadInput,
            request.data,
        )
        updated = replace_head(
            request,
            member.pk,
            values,
        )
        return Response(
            self.get_serializer(updated).data
        )
    @extend_schema(
        request=InvitationInput,
        responses={201: MembershipSerializer},
    )
    @transaction.atomic
    def create(self, request):
        if request.user.is_superuser:
            # The selected institute is explicit, not the platform user's context.
            institute_id = request.data.get("institute")
            if not institute_id:
                raise ValidationError({"institute": "Select an institute."})
            institute = Institute.objects.filter(
                pk=institute_id, active=True
            ).first()
            if institute is None:
                raise ValidationError({"institute": "Select an active institute."})
            Institute.objects.select_for_update().get(pk=institute.pk)
        else:
            scope = Scope(request)
            scope.require("admin")
            institute = Institute.objects.select_for_update().get(
                pk=scope.institute.pk
            )
            if request.data.get("institute") and str(request.data["institute"]) != str(institute.pk):
                raise PermissionDenied("Cannot provision accounts for another institute.")

        values = payload(
            InvitationInput,
            request.data,
        )
        if request.user.is_superuser and values.get("role") != "admin":
            raise PermissionDenied("Platform access can create Institute Administrators only.")

        username = values["username"]
        email = values["email"]
        if not username or len(username) > 150:
            raise ValidationError({
                "username":
                    "Enter a username up to 150 characters."
            })
        try:
            validate_email(email)
        except DjangoValidationError:
            raise ValidationError({
                "email": "Enter a valid email."
            })
        account_exists = (
            User.objects.filter(username=username).exists()
            or User.objects.filter(email__iexact=email).exists()
        )
        if account_exists:
            raise ValidationError(
                "Account already exists. Platform administrators "
                "can attach an existing user by ID."
            )
        serializer = self.get_serializer(data=values)
        serializer.is_valid(raise_exception=True)
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=values["first_name"],
            last_name=values["last_name"],
            password=None,
        )
        member = serializer.save(
            user=user,
            institute=institute,
        )
        Audit.objects.create(
            institute=institute,
            actor=request.user,
            action="Membership.invite",
            object_id=str(member.pk),
        )
        transaction.on_commit(
            lambda: send_invitation(user)
        )
        return Response(
            self.get_serializer(member).data,
            status=201,
        )
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        scope = Scope(request)
        scope.require("admin")
        Institute.objects.select_for_update().get(
            pk=scope.institute.pk
        )
        return super().update(
            request,
            *args,
            **kwargs,
        )
    @transaction.atomic
    def perform_update(self, serializer):
        scope = Scope(self.request)
        scope.require("admin")
        if serializer.instance.user_id == self.request.user.pk:
            raise ValidationError(
                "You cannot change your own membership."
            )
        previous_eligibility = [
            str(value)
            for value in (
                serializer.instance.eligible_units
                .values_list("pk", flat=True)
            )
        ]
        serializer.save()
        current_eligibility = [
            str(value)
            for value in (
                serializer.instance.eligible_units
                .values_list("pk", flat=True)
            )
        ]
        Audit.objects.create(
            institute=scope.institute,
            actor=self.request.user,
            action="Membership.update",
            object_id=str(serializer.instance.pk),
            detail={
                "previous_eligible_units": previous_eligibility,
                "eligible_units": current_eligibility,
            },
        )
    @extend_schema(
        request=AttachInput,
        responses={201: MembershipSerializer},
    )
    @action(
        detail=False,
        methods=["post"],
    )
    @transaction.atomic
    def attach(self, request):
        if not request.user.is_superuser:
            raise PermissionDenied(
                "Only platform administrators can link existing accounts."
            )
        institute_id = request.data.get("institute")
        if not institute_id:
            raise ValidationError({"institute": "Select an institute."})
        institute = Institute.objects.filter(pk=institute_id, active=True).first()
        if institute is None:
            raise ValidationError({"institute": "Select an active institute."})
        Institute.objects.select_for_update().get(pk=institute.pk)
        values = payload(
            AttachInput,
            request.data,
        )
        if values["role"] != "admin":
            raise PermissionDenied(
                "Only Institute Admin appointments are available "
                "through platform access."
            )
        user = User.objects.filter(
            pk=values["user"]
        ).first()
        eligible_account = (
            user is not None
            and (
                user.is_superuser
                or Membership.objects.filter(
                    user=user,
                    role="admin",
                ).exists()
            )
        )
        if not eligible_account:
            raise ValidationError(
                "Choose an existing administrative account, "
                "or provision a new Institute Admin account."
            )
        if Membership.objects.filter(
            user=user,
            institute=institute,
        ).exists():
            raise ValidationError(
                "Membership already exists."
            )
        serializer = self.get_serializer(data=values)
        serializer.is_valid(raise_exception=True)
        member = serializer.save(
            user=user,
            institute=institute,
        )
        Audit.objects.create(
            institute=institute,
            actor=request.user,
            action="Membership.attach",
            object_id=str(member.pk),
        )
        return Response(
            self.get_serializer(member).data,
            status=201,
        )
    @extend_schema(
        request=CsvImportInput,
        responses={
            200: CsvImportResult,
            201: CsvImportResult,
        },
    )
    @action(
        detail=False,
        methods=["post"],
        url_path="import-csv",
    )
    @transaction.atomic
    def import_csv(self, request):
        from .importing import import_people
        return import_people(
            request,
            self.get_serializer_class(),
        )
    @extend_schema(
        responses={
            (200, "text/csv"): OpenApiTypes.BINARY,
        }
    )
    @action(
        detail=False,
        methods=["get"],
        url_path="import-template",
    )
    def import_template(self, request):
        scope = Scope(request)
        scope.require("admin")
        if scope.role == "superadmin":
            raise PermissionDenied(
                "Student and teacher provisioning belongs "
                "to Institute Admin."
            )
        response = HttpResponse(
            content_type="text/csv"
        )
        response["Content-Disposition"] = (
            'attachment; filename="students-staff-template.csv"'
        )
        writer = csv.writer(response)
        writer.writerow([
            "username",
            "email",
            "role",
            "first_name",
            "unit",
            "display_name",
            "student_identifier",
            "section",
        ])
        writer.writerow([
            "new.student",
            "new.student@example.test",
            "student",
            "New",
            "",
            "New Student",
            "STUDENT-001",
            "",
        ])
        return response