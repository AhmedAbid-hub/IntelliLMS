"""Versioned inference inputs. Never map VLE clicks to activity or attendance."""
from django.utils import timezone
from apps.learning.models import Assignment, Submission
from ml.oulad import SCHEMA


def prediction_inputs(offering, student, metadata, row=None):
    if metadata.get("feature_schema") != SCHEMA:
        from .services import student_features
        from ml.train import FEATURES
        if row is not None:
            return {key: row[key] for key in FEATURES}, {key: row[key] for key in ["attendance_records", "graded_assignments", "graded_quizzes"]}, {}
        features, counts = student_features(offering, student)
        return features, counts, {}
    now = timezone.now()
    submissions = list(Submission.objects.filter(institute=offering.institute,
        assignment__institute=offering.institute, assignment__offering=offering,
        assignment__published=True, assignment__due_at__lt=now, student=student,
        released=True, marks__isnull=False, submitted_at__lte=now)
        .select_related("assignment").order_by("-assignment__due_at", "-pk")[:2])
    submissions.reverse()
    features = {"previous_assignment_pct": None, "latest_assignment_pct": None}
    evidence = {"assignments": []}
    for submission in submissions:
        evidence["assignments"].append({"id": str(submission.assignment_id), "title": submission.assignment.title,
            "percentage": float(submission.marks * 100 / submission.assignment.max_marks),
            "submitted_at": submission.submitted_at.isoformat(), "due_at": submission.assignment.due_at.isoformat()})
    chronological = len(submissions) == 2 and submissions[0].assignment.due_at < submissions[1].assignment.due_at
    if chronological:
        features = dict(zip(features, [entry["percentage"] for entry in evidence["assignments"]]))
    submitted = Submission.objects.filter(institute=offering.institute, student=student,
        assignment__offering=offering).values("assignment_id")
    upcoming = Assignment.objects.filter(institute=offering.institute, offering=offering,
        published=True, due_at__gt=now).exclude(pk__in=submitted).order_by("due_at", "pk").first()
    if upcoming:
        evidence["next_assignment"] = {"id": str(upcoming.pk), "title": upcoming.title, "due_at": upcoming.due_at.isoformat()}
    return features, {"eligible_assignments": len(submissions) if chronological else 0,
                      "future_assignments": int(upcoming is not None)}, evidence
