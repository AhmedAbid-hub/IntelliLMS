from collections import defaultdict
from datetime import timedelta
from django.db.models import (
    Count,
    Q,
    F,
    OuterRef,
    Subquery,
    Avg,
    FloatField,
    ExpressionWrapper,
)
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema
from .report_contracts import RiskResult, TrendsResult
from apps.accounts.scope import Scope
from .workload import workload_queryset
from apps.learning.models import Submission, Attendance
from .models import Activity, Prediction
from .gradebook import iter_gradebook
from .filters import AcademicFilters, enrollment_queryset, offering_queryset, restrict_report_pairs


class CourseReportQuery(AcademicFilters):
    pass


def course_values(request):
    query = CourseReportQuery(data=request.query_params.dict())
    query.is_valid(raise_exception=True)
    return query.validated_data


def latest_predictions(scope, version=None):
    scoped = Prediction.objects.filter(
        institute=scope.institute, offering__in=scope.offerings()
    )
    if version is not None:
        scoped = scoped.filter(version=version)
    latest = (
        scoped.filter(
            student_id=OuterRef("student_id"), offering_id=OuterRef("offering_id")
        )
        .order_by("-created_at", "-pk")
        .values("pk")[:1]
    )
    return scoped.filter(pk=Subquery(latest))


@extend_schema(parameters=[CourseReportQuery], responses=RiskResult)
@api_view(["GET"])
def risk_summary(request):
    scope = Scope(request)
    scope.require("admin", "head", "teacher")
    from ml.inference import status
    model = status()
    qs = latest_predictions(scope, version=model["version"]) if model["status"] == "ready" else Prediction.objects.none()
    basis = (f"Latest estimates using {model['version']}: {model.get('target_label', 'configured model target')}. Older/different-target estimates remain in history and are excluded from these counts."
             if model["status"] == "ready" else "Risk counts are unavailable until the configured model is verified. Saved estimates remain in history.")
    values = course_values(request)
    offerings = offering_queryset(scope, values)
    qs = qs.filter(offering__in=offerings)
    history = Prediction.objects.filter(institute=scope.institute, offering__in=offerings)
    if "stage" in values:
        qs = restrict_report_pairs(qs, enrollment_queryset(scope, values))
        history = restrict_report_pairs(history, enrollment_queryset(scope, values))
    distribution = {x: 0 for x in ["low", "moderate", "high"]}
    for row in qs.values("category").annotate(total=Count("id")):
        distribution[row["category"]] = row["total"]
    from .readiness import prediction_readiness
    return Response(
        {
            "distribution": distribution,
            "learner_course_pairs": qs.count(),
            "basis": basis,
            "readiness": prediction_readiness(scope, values, offerings, model, history),
            "warning": "EXPERIMENTAL ESTIMATES — NOT VALIDATED FOR ACADEMIC DECISIONS",
        }
    )


@extend_schema(parameters=[CourseReportQuery], responses=TrendsResult)
@api_view(["GET"])
def trends(request):
    scope = Scope(request)
    values = course_values(request)
    offerings = offering_queryset(scope, values)
    enrollments = enrollment_queryset(scope, values)
    start = timezone.now() - timedelta(days=30)
    activity = Activity.objects.filter(
        institute=scope.institute, offering__in=offerings, created_at__gte=start
    )
    attendance = Attendance.objects.filter(
        institute=scope.institute,
        session__offering__in=offerings,
        session__date__gte=start.date(),
    ).exclude(status="excused")
    submissions = Submission.objects.filter(
        institute=scope.institute,
        assignment__offering__in=offerings,
        released=True,
        marks__isnull=False,
        submitted_at__gte=start,
    )
    if "stage" in values:
        activity = restrict_report_pairs(activity, enrollments, student="user_id")
        attendance = restrict_report_pairs(attendance, enrollments, offering="session__offering_id")
        submissions = restrict_report_pairs(submissions, enrollments, offering="assignment__offering_id")
    if scope.role == "student":
        activity = activity.filter(user=request.user)
        attendance = attendance.filter(student=request.user)
        submissions = submissions.filter(student=request.user)
    events = list(
        activity.annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )
    attendance_days = []
    for row in (
        attendance.values("session__date")
        .annotate(
            total=Count("id"),
            present=Count("id", filter=Q(status__in=["present", "late"])),
        )
        .order_by("session__date")
    ):
        attendance_days.append(
            {
                "date": row["session__date"],
                "percentage": round(row["present"] / row["total"] * 100, 1),
                "records": row["total"],
            }
        )
    scores = list(
        submissions.annotate(date=TruncDate("submitted_at"))
        .values("date")
        .annotate(
            percentage=Avg(
                ExpressionWrapper(
                    F("marks") * 100.0 / F("assignment__max_marks"),
                    output_field=FloatField(),
                )
            ),
            assessments=Count("id"),
        )
        .order_by("date")
    )
    units = defaultdict(
        lambda: {
            "name": "Unassigned",
            "score_sum": 0,
            "score_count": 0,
            "attendance_sum": 0,
            "attendance_count": 0,
        }
    )
    department_counts = {}
    if scope.role in ["admin", "head", "superadmin"]:
        # Distinct counts belong in SQL; retaining every learner UUID in Python
        # made memory grow with the whole cohort. Group by identity, not label.
        department_counts = {
            str(row["offering__course__unit_id"]) if row["offering__course__unit_id"] else None: row
            for row in enrollments.order_by().values("offering__course__unit_id").annotate(
                learners=Count("student_id", distinct=True),
                courses=Count("offering_id", distinct=True),
            )
        }
    submitted = available = 0
    for row in iter_gradebook(scope, enrollments):
        submitted += row["submitted_assignments"]
        available += row["available_assignments"]
        if scope.role in ["admin", "head", "superadmin"]:
            unit = units[row["unit"]]
            unit["name"] = row["unit_label"]
            for key, field in [("score", "score"), ("attendance", "attendance_pct")]:
                if row[field] is not None:
                    unit[key + "_sum"] += row[field]
                    unit[key + "_count"] += 1
    departments = [
        {
            "unit_id": unit_id,
            "unit": unit["name"],
            "learners": department_counts.get(unit_id, {}).get("learners", 0),
            "courses": department_counts.get(unit_id, {}).get("courses", 0),
            "average_score": (
                round(unit["score_sum"] / unit["score_count"], 2)
                if unit["score_count"]
                else None
            ),
            "average_attendance": (
                round(unit["attendance_sum"] / unit["attendance_count"], 2)
                if unit["attendance_count"]
                else None
            ),
        }
        for unit_id, unit in sorted(units.items(), key=lambda item: (item[1]["name"], item[0] or ""))
    ]
    workload = []
    if scope.role != "student":
        teachers = workload_queryset(scope, values)[:5]
        workload = [
            {
                "teacher": teacher.get_full_name() or teacher.username,
                "courses": teacher.courses,
                "learners": teacher.learners,
            }
            for teacher in teachers
        ]
    return Response(
        {
            "window_days": 30,
            "activity": events,
            "attendance": attendance_days,
            "assignment_scores": scores,
            "departments": departments,
            "instructor_workload": workload,
            "instructor_workload_preview_limit": 5,
            "assignment_completion_pct": (
                round(submitted / available * 100, 1) if available else None
            ),
            "score_basis": "Current released assignment percentages grouped by submission date; this is not a historical grade snapshot.",
        }
    )
