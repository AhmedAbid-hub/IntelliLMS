"""Learning attendance API; extracted without changing behavior."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from apps.academics.models import Enrollment
from apps.academics.views import TenantViewSet
from ..contracts import AttendanceInput, AttendanceResult, payload
from ..models import AttendanceSession, Attendance
from ..governance import require_unfinalized
from ..roster import AttendanceHistorySerializer, RosterQuery, RosterRow, roster_response
from .base import LearningViewSet, require_assigned_instructor


class AttendanceSessionViewSet(LearningViewSet):
    model = AttendanceSession

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.instance = get_object_or_404(
            AttendanceSession.objects.select_for_update(),
            pk=serializer.instance.pk,
            institute=self.scope.institute,
        )

        require_unfinalized(serializer.instance)

        super().perform_update(serializer)

    @extend_schema(
        parameters=[RosterQuery],
        responses=RosterRow(many=True),
    )
    @action(
        detail=True,
        methods=["get"],
        filter_backends=[],
    )
    def roster(self, request, pk=None):
        return roster_response(self, request)

    @extend_schema(
        request=AttendanceInput,
        responses=AttendanceResult,
    )
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def mark(self, request, pk=None):
        self.scope.require("admin", "head", "teacher")

        scoped = self.get_object()

        session = get_object_or_404(
            AttendanceSession.objects.select_for_update(),
            pk=scoped.pk,
            institute=self.scope.institute,
        )

        self.scope.check_offering(
            session.offering,
            write=True,
        )

        require_unfinalized(session)

        require_assigned_instructor(self.scope, self.request.user, session.offering)

        records = payload(
            AttendanceInput,
            request.data,
        )["records"]

        if (
            not isinstance(records, list)
            or not records
            or len(records) > 500
        ):
            raise ValidationError(
                "Supply between 1 and 500 attendance records."
            )

        normalized = []

        for row in records:
            if (
                not isinstance(row, dict)
                or "student" not in row
                or row.get("status") not in (
                    "present",
                    "absent",
                    "late",
                    "excused",
                )
            ):
                raise ValidationError(
                    "Invalid attendance record."
                )

            normalized.append({
                "student": str(row["student"]),
                "status": row["status"],
            })

        student_ids = [
            row["student"]
            for row in normalized
        ]

        if len(student_ids) != len(set(student_ids)):
            raise ValidationError(
                "Duplicate student in request."
            )

        students = {
            str(student_id)
            for student_id in Enrollment.objects.filter(
                institute=self.scope.institute,
                offering=session.offering,
                active=True,
                student_id__in=student_ids,
            ).values_list(
                "student_id",
                flat=True,
            )
        }

        if set(student_ids) != students:
            raise ValidationError(
                "One or more students are not actively "
                "enrolled in this offering."
            )

        for row in normalized:
            obj, created = Attendance.objects.update_or_create(
                institute=self.scope.institute,
                session=session,
                student_id=row["student"],
                defaults={
                    "status": row["status"],
                },
            )

            self.audit(
                obj,
                "mark_" + row["status"],
            )

        return Response({
            "updated": len(normalized),
        })


class AttendanceViewSet(TenantViewSet):
    model = Attendance
    offering_path = "session__offering"

    http_method_names = [
        "get",
        "head",
        "options",
    ]

    filterset_fields = ["session", "student"]

    def get_serializer_class(self):
        return AttendanceHistorySerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset().select_related(
            "student",
            "session__offering",
        )

        if self.scope.role == "student":
            return qs.filter(
                student=self.request.user
            )

        return qs
