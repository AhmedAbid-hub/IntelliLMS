"""Accounts memberships API; extracted without changing behavior."""
import csv
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models.deletion import Collector, ProtectedError, RestrictedError
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from apps.insights.models import Audit
from ..contracts import InvitationInput, AttachInput, CsvImportInput, CsvImportResult, payload
from ..invitations import send_invitation, invitation_status, InvitationStatus
from ..lifecycle import TransitionInput, ReplaceHeadInput, ImpactResult, transition, replace_head
from ..models import Institute, Membership, User, AccountInvitation
from ..scope import Scope
from ..serializers.memberships import MembershipSerializer


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

        "delete",

        "head",

        "options",

    ]

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Permanently delete an unused, inactive membership and its unused user."""
        scope = Scope(request)
        scope.require("admin")
        if request.user.is_superuser:
            raise PermissionDenied("Platform accounts cannot be permanently deleted here.")

        Institute.objects.select_for_update().get(pk=scope.institute.pk)
        member = self.get_object()
        member = Membership.objects.select_for_update().select_related("user").get(
            pk=member.pk, institute=scope.institute
        )
        user = User.objects.select_for_update().get(pk=member.user_id)

        if member.role == "admin" or user.is_superuser or user.is_staff:
            raise PermissionDenied("Administrative accounts cannot be permanently deleted here.")
        if user.pk == request.user.pk:
            raise ValidationError("You cannot delete your own account.")
        if member.active:
            raise ValidationError("Deactivate this membership before permanently deleting it.")
        if Membership.objects.filter(user=user).exclude(pk=member.pk).exists():
            raise ValidationError("This account belongs to another institute and cannot be deleted.")
        if request.data.get("confirm_username") != user.username:
            raise ValidationError({"confirm_username": "Enter the exact username to confirm permanent deletion."})

        # Django's deletion collector inspects every registered FK relationship.
        # Allow only this membership and its invitation to cascade. Everything
        # else, including academic history, appointments and audit actor links,
        # must prevent deletion rather than being silently removed.
        collector = Collector(using=user._state.db or "default")
        try:
            collector.collect([user])
        except (ProtectedError, RestrictedError):
            raise ValidationError(
                "This account has protected records. Keep it deactivated instead."
            )
        permitted = {User, Membership, AccountInvitation}
        for model, instances in collector.data.items():
            if model not in permitted:
                raise ValidationError(
                    "This account has related records and cannot be permanently deleted. "
                    "Keep it deactivated instead."
                )
            if model is Membership and any(item.pk != member.pk for item in instances):
                raise ValidationError("This account has other memberships.")
        if collector.fast_deletes:
            raise ValidationError("This account has related records and cannot be deleted.")
        if collector.restricted_objects:
            raise ValidationError("This account has protected related records.")

        member_id = str(member.pk)
        username = user.username
        # Delete the user, which cascades to the sole membership and invitation.
        # This is deliberately restricted to accounts with no academic history.
        user.delete()
        Audit.objects.create(
            institute=scope.institute,
            actor=request.user,
            action="Membership.permanent_delete",
            object_id=member_id,
            detail={"username": username, "reason": "Unused inactive account deleted"},
        )
        return Response(status=204)

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

        from ..profile import avatar_response

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

    def resend_invitation(self, request, pk=None):
        scope = Scope(request)
        scope.require("admin")
        member = self.get_object()
        if scope.role == "admin" and member.role == "admin":
            raise PermissionDenied("Institute Admin invitations are managed by Super Admin.")
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=member.user_id)
            if not member.active or not user.is_active:
                raise ValidationError("Reactivate the membership/account before inviting it.")
            status = invitation_status(user)
            if user.has_usable_password() or status["state"] == "accepted":
                raise ValidationError("This account has completed setup. The user can request a password reset.")
            queued = send_invitation(user, resend=True)
            if queued:
                Audit.objects.create(
                    institute=scope.institute, actor=request.user,
                    action="Membership.resend_invitation", object_id=str(member.pk),
                )
        # on_commit has finished in ordinary requests. Query fresh delivery evidence.
        # Under an outer transaction the honest result remains pending.
        return Response(invitation_status(user))

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

            .exclude(term__status="closed")

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

        serializer = self.get_serializer(data=values, context={**self.get_serializer_context(), "membership_institute": institute})

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

        send_invitation(user)

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

        serializer = self.get_serializer(data=values, context={**self.get_serializer_context(), "membership_institute": institute})

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

        from ..importing import import_people

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
