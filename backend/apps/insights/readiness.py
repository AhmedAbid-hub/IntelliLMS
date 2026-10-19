"""Read-only prediction coverage; never generate estimates to fill an empty chart."""
from django.db.models import Count, Exists, F, OuterRef, Q, Subquery
from django.utils import timezone

from apps.accounts.models import Membership
from apps.learning.models import Assignment, Submission
from ml.oulad import SCHEMA
from .filters import enrollment_queryset


def prediction_readiness(scope, values, offerings, model, history):
    open_courses = offerings.filter(archived=False).exclude(term__status="closed")
    members = Membership.objects.filter(
        institute=scope.institute, active=True, role="student", user__is_active=True,
    ).values("user_id")
    learners = enrollment_queryset(scope, values).filter(
        offering__in=open_courses, student_id__in=members,
    )
    coverage = {
        "courses": offerings.count(), "open_courses": open_courses.count(),
        "learner_course_pairs": learners.count(), "eligible_pairs": None,
        "insufficient_history_pairs": None, "no_upcoming_pairs": None,
        "historical_estimates": history.exclude(version=model.get("version", "")).count(),
        "model_status": model["status"],
    }
    if model.get("feature_schema") == SCHEMA and model["status"] == "ready":
        now = timezone.now()
        recorded = Submission.objects.filter(
            institute_id=OuterRef("institute_id"), assignment__institute_id=OuterRef("institute_id"),
            assignment__offering_id=OuterRef("offering_id"), student_id=OuterRef("student_id"),
            assignment__published=True, assignment__due_at__lt=now,
            released=True, marks__isnull=False, submitted_at__lte=now,
        ).order_by("-assignment__due_at", "-pk")
        # Nested correlation: submission belongs to this assignment and the outer enrollment's learner.
        submitted = Submission.objects.filter(
            assignment_id=OuterRef("pk"), institute_id=OuterRef("institute_id"),
            student_id=OuterRef(OuterRef("student_id")),
        )
        upcoming = Assignment.objects.filter(
            institute_id=OuterRef("institute_id"), offering_id=OuterRef("offering_id"),
            published=True, due_at__gt=now,
        ).exclude(Exists(submitted))
        learners = learners.annotate(
            latest_due=Subquery(recorded.values("assignment__due_at")[:1]),
            previous_due=Subquery(recorded.values("assignment__due_at")[1:2]),
            latest_marks=Subquery(recorded.values("marks")[:1]),
            previous_marks=Subquery(recorded.values("marks")[1:2]),
            latest_max=Subquery(recorded.values("assignment__max_marks")[:1]),
            previous_max=Subquery(recorded.values("assignment__max_marks")[1:2]),
            has_upcoming=Exists(upcoming),
        )
        valid = Q(previous_due__lt=F("latest_due"), previous_marks__gte=0,
                  latest_marks__gte=0, previous_max__gt=0, latest_max__gt=0,
                  previous_marks__lte=F("previous_max"), latest_marks__lte=F("latest_max"))
        counts = learners.aggregate(
            history_ready=Count("pk", filter=valid),
            eligible=Count("pk", filter=valid & Q(has_upcoming=True)),
        )
        coverage.update(
            eligible_pairs=counts["eligible"],
            insufficient_history_pairs=coverage["learner_course_pairs"] - counts["history_ready"],
            no_upcoming_pairs=counts["history_ready"] - counts["eligible"],
        )
    reason = ""
    if scope.role == "admin":
        reason = "Institute Admin has read-only oversight. Assigned teachers generate estimates in their teaching workspace."
    elif scope.role == "head":
        reason = ("Department management is read-only. Switch to My Teaching to analyze your assigned courses."
                  if scope.membership.can_teach else
                  "Department management is read-only. Your Institute Admin must authorize teaching capability and a course assignment before you can generate estimates.")
    elif not coverage["courses"]:
        reason = "No assigned courses match this scope. Ask your academic administrator to verify your teaching assignment."
    elif not coverage["open_courses"]:
        reason = "These courses are archived or their academic periods are closed. Existing estimates remain available in history."
    elif model["status"] != "ready":
        reason = model.get("detail", "The configured model is unavailable. Ask an administrator to verify it.")
    elif not coverage["learner_course_pairs"]:
        reason = "No active learners are enrolled in the selected open courses."
    coverage.update(can_generate=scope.role == "teacher" and not reason, generation_reason=reason)
    return coverage
