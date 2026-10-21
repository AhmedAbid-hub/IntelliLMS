"""Insights dashboards API; extracted without changing behavior."""
from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from apps.accounts.models import Institute, Membership, User
from apps.accounts.scope import Scope
from apps.academics.models import Enrollment
from apps.learning.models import Attendance, Submission
from ..models import Activity
from ..services import gradebook
from ..filters import enrollment_queryset
from ..report_contracts import DashboardResult, PlatformResult


@extend_schema(responses=DashboardResult)
@api_view(["GET"])
def analytics(request):
    scope = Scope(request)

    offerings = scope.offerings()
    structure_counts = {}
    if scope.role == "admin":
        from apps.accounts.institution import academic_config
        from apps.academics.models import Program, Section, Course, Term, Unit, AdmissionBatch
        config = academic_config(scope.institute)
        for key, model in [("program", Program), ("section", Section), ("course", Course)]:
            structure_counts[key] = model.objects.filter(institute=scope.institute, active=True).count()
        structure_counts["term"] = Term.objects.filter(institute=scope.institute, status="active").count()
        if config["departments"]:
            structure_counts["unit"] = Unit.objects.filter(institute=scope.institute).count()
        if config["batches"]:
            structure_counts["batch"] = AdmissionBatch.objects.filter(institute=scope.institute, active=True).count()

    enrollments = Enrollment.objects.filter(
        offering__in=offerings,
        active=True,
    )

    attendance = Attendance.objects.filter(
        session__offering__in=offerings,
    ).exclude(
        status="excused",
    )

    submissions = Submission.objects.filter(
        assignment__offering__in=offerings,
    )

    activity = Activity.objects.filter(
        offering__in=offerings,
    )

    if scope.role == "student":
        enrollments = enrollments.filter(
            student=request.user,
        )

        attendance = attendance.filter(
            student=request.user,
        )

        submissions = submissions.filter(
            student=request.user,
        )

        activity = activity.filter(
            user=request.user,
        )

    attendance_count = attendance.count()

    present_count = attendance.filter(
        status__in=["present", "late"],
    ).count()

    attendance_pct = (
        round(
            present_count / attendance_count * 100,
            1,
        )
        if attendance_count
        else None
    )

    return Response(
        {
            "active_courses": offerings.filter(
                archived=False,
            ).count(),
            "students": (
                enrollments.values("student")
                .distinct()
                .count()
            ),
            "teachers": (
                User.objects.filter(
                    teaching__in=offerings,
                )
                .distinct()
                .count()
            ),
            "enrollments": enrollments.count(),
            "attendance_pct": attendance_pct,
            "submissions": submissions.count(),
            "activity_events": activity.count(),
            "gradebook": gradebook(
                scope,
                enrollment_queryset(scope)[:5],
            ),
            "gradebook_preview_limit": 5,
            "activity_by_kind": list(
                activity.values("kind").annotate(
                    count=Count("id"),
                )
            ),
            "institute": scope.institute.name,
            "role": scope.role,
            "structure_counts": structure_counts,
        }
    )


@extend_schema(responses=PlatformResult)
@api_view(["GET"])
def platform(request):
    if not request.user.is_superuser:
        raise PermissionDenied()

    return Response(
        {
            "institutes": Institute.objects.count(),
            "active_institutes": Institute.objects.filter(
                active=True,
            ).count(),
            "institute_administrators": Membership.objects.filter(
                role="admin", active=True, user__is_active=True, institute__active=True,
            ).values("user_id").distinct().count(),
            "users": User.objects.count(),
            "memberships": Membership.objects.filter(
                active=True,
            ).count(),
        }
    )
