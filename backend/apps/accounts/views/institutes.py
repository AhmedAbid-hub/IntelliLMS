"""Accounts institutes API; extracted without changing behavior."""
from django.db import transaction
from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from apps.insights.models import Audit
from ..models import Institute, Membership
from ..scope import Scope
from ..serializers.institutes import InstituteSerializer
from ..serializers.memberships import MembershipSerializer


class InstituteViewSet(viewsets.ModelViewSet):

    serializer_class = InstituteSerializer

    search_fields = ["name", "code"]

    INSTITUTE_ADMIN_EDITABLE_FIELDS = frozenset({

        "name",

        "terminology",

        "grading_rules",

        "policy_change_reason",

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

        serializer.validated_data.pop("policy_change_reason", None)

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

        reason = serializer.validated_data.pop("policy_change_reason", "").strip()

        previous_rules = serializer.instance.grading_rules or {}

        next_rules = serializer.validated_data.get("grading_rules", previous_rules)

        defaults = {"lock_released_grades": False, "attendance_edit_window_days": None, "gpa_policy": None}

        if any(previous_rules.get(key, default) != next_rules.get(key, default) for key, default in defaults.items()) and len(reason) < 5:

            raise ValidationError({"policy_change_reason": "Explain the academic policy change in at least five characters."})

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

                    **({"previous_rules": previous_rules, "current_rules": institute.grading_rules, "reason": reason} if "grading_rules" in changed_fields else {}),

                },

            )

    def perform_destroy(self, instance):

        raise ValidationError(

            "Deactivate institutes to preserve academic records."

        )
