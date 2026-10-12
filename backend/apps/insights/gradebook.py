"""Build authorized gradebook rows with bounded query count, not a query per learner."""

from collections import defaultdict, Counter
from django.db.models import Count, Q, Sum
from django.utils import timezone
from apps.academics.models import Enrollment
from apps.learning.models import (
    Assignment,
    Submission,
    Quiz,
    Attempt,
    Lesson,
    Completion,
    Attendance,
    ManualGrade,
)
from .models import Activity
from apps.accounts.configuration import classify_grade


def mean(values):
    return round(sum(values) / len(values), 2) if values else None


def gradebook(scope, enrollments=None):
    if enrollments is None:
        from .filters import enrollment_queryset

        enrollments = enrollment_queryset(scope)
    enrollments = list(enrollments)
    if not enrollments:
        return []
    pairs = {(e.offering_id, e.student_id) for e in enrollments}
    offerings = {e.offering_id for e in enrollments}
    students = {e.student_id for e in enrollments}
    data = defaultdict(
        lambda: {
            "assignments": [],
            "quizzes": [],
            "manual": [],
            "submitted": 0,
            "attended": 0,
            "attendance": 0,
            "completed": 0,
            "activity": 0,
        }
    )
    available = Counter(
        Assignment.objects.filter(
            offering_id__in=offerings, published=True
        ).values_list("offering_id", flat=True)
    )
    submissions = Submission.objects.filter(
        assignment__offering_id__in=offerings, student_id__in=students
    ).values(
        "assignment__offering_id",
        "student_id",
        "assignment__published",
        "assignment__max_marks",
        "marks",
        "released",
    )
    for submission in submissions:
        key = (submission["assignment__offering_id"], submission["student_id"])
        if key not in pairs:
            continue
        value = data[key]
        value["submitted"] += int(submission["assignment__published"])
        if submission["released"] and submission["marks"] is not None:
            value["assignments"].append(
                float(submission["marks"]) / submission["assignment__max_marks"] * 100
            )
    quiz_totals = {
        row["id"]: row["total"]
        for row in Quiz.objects.filter(offering_id__in=offerings, released=True)
        .annotate(total=Sum("questions__marks"))
        .values("id", "total")
    }
    quiz_attempts = defaultdict(list)
    for attempt in (
        Attempt.objects.filter(
            quiz_id__in=quiz_totals,
            student_id__in=students,
            submitted_at__isnull=False,
            marks__isnull=False,
        )
        .order_by("submitted_at", "created_at", "pk")
        .values("quiz_id", "quiz__offering_id", "student_id", "marks")
    ):
        key = (attempt["quiz__offering_id"], attempt["student_id"])
        if key in pairs and quiz_totals[attempt["quiz_id"]]:
            quiz_attempts[(key, attempt["quiz_id"])].append(
                float(attempt["marks"]) / quiz_totals[attempt["quiz_id"]] * 100
            )
    policy = scope.institute.grading_rules.get("quiz_attempt_policy", "mean")
    for (key, quiz_id), values in quiz_attempts.items():
        data[key]["quizzes"].append(
            max(values)
            if policy == "best"
            else values[-1] if policy == "latest" else mean(values)
        )
    for grade in ManualGrade.objects.filter(
        offering_id__in=offerings, student_id__in=students, released=True
    ).values("offering_id", "student_id", "marks", "max_marks"):
        key = (grade["offering_id"], grade["student_id"])
        if key in pairs:
            data[key]["manual"].append(float(grade["marks"]) / grade["max_marks"] * 100)
    visible = Lesson.objects.filter(offering_id__in=offerings, published=True).filter(
        Q(visible_at__isnull=True) | Q(visible_at__lte=timezone.now())
    )
    lesson_counts = Counter(visible.values_list("offering_id", flat=True))
    for row in (
        Completion.objects.filter(lesson__in=visible, student_id__in=students)
        .values("lesson__offering_id", "student_id")
        .annotate(total=Count("id"))
    ):
        key = (row["lesson__offering_id"], row["student_id"])
        if key in pairs:
            data[key]["completed"] = row["total"]
    for row in (
        Attendance.objects.filter(
            session__offering_id__in=offerings, student_id__in=students
        )
        .exclude(status="excused")
        .values("session__offering_id", "student_id")
        .annotate(
            total=Count("id"),
            attended=Count("id", filter=Q(status__in=["present", "late"])),
        )
    ):
        key = (row["session__offering_id"], row["student_id"])
        if key in pairs:
            data[key]["attendance"] = row["total"]
            data[key]["attended"] = row["attended"]
    for row in (
        Activity.objects.filter(offering_id__in=offerings, user_id__in=students)
        .values("offering_id", "user_id")
        .annotate(total=Count("id"))
    ):
        key = (row["offering_id"], row["user_id"])
        if key in pairs:
            data[key]["activity"] = row["total"]
    results = []
    for enrollment in enrollments:
        offering = enrollment.offering
        student = enrollment.student
        record = data[(offering.id, student.id)]
        features = {
            "assignment_pct": mean(record["assignments"]),
            "quiz_pct": mean(record["quizzes"]),
            "manual_pct": mean(record["manual"]),
            "attendance_pct": (
                round(record["attended"] / record["attendance"] * 100, 2)
                if record["attendance"]
                else None
            ),
            "completion_pct": (
                round(record["completed"] / lesson_counts[offering.id] * 100, 2)
                if lesson_counts[offering.id]
                else None
            ),
            "activity_count": record["activity"],
        }
        weighted = [
            (features[name], weight)
            for name, weight in [
                ("assignment_pct", offering.assignment_weight),
                ("quiz_pct", offering.quiz_weight),
                ("manual_pct", offering.manual_weight),
            ]
            if features[name] is not None and weight
        ]
        if (
            weighted
            and scope.institute.grading_rules.get("missing_category_policy") == "zero"
        ):
            weighted = [
                (features[name] or 0, weight)
                for name, weight in [
                    ("assignment_pct", offering.assignment_weight),
                    ("quiz_pct", offering.quiz_weight),
                    ("manual_pct", offering.manual_weight),
                ]
                if weight
            ]
        score = (
            sum(value * weight for value, weight in weighted)
            / sum(weight for _, weight in weighted)
            if weighted
            else None
        )
        score = round(score, 2) if score is not None else None
        pass_mark = scope.institute.grading_rules.get("pass_mark", 50)
        results.append(
            {
                "student": str(student.id),
                "student_label": student.get_full_name() or student.username,
                "offering": str(offering.id),
                "offering_label": offering.title,
                "unit": (
                    str(offering.course.unit_id) if offering.course.unit_id else None
                ),
                "unit_label": (
                    offering.course.unit.name if offering.course.unit else "Unassigned"
                ),
                "score": round(score, 2) if score is not None else None,
                "provisional": True,
                **classify_grade(score, scope.institute.grading_rules),
                "pass_mark": pass_mark,
                "meeting_pass_mark": score >= pass_mark if score is not None else None,
                **features,
                "attendance_records": record["attendance"],
                "graded_assignments": len(record["assignments"]),
                "graded_quizzes": len(record["quizzes"]),
                "published_lessons": lesson_counts[offering.id],
                "completed_lessons": record["completed"],
                "available_assignments": available[offering.id],
                "submitted_assignments": record["submitted"],
                "assignment_completion_pct": (
                    round(record["submitted"] / available[offering.id] * 100, 1)
                    if available[offering.id]
                    else None
                ),
            }
        )
    return results


def iter_gradebook(scope, queryset=None, batch_size=100):
    """Keyset batches prevent report size from becoming Python row memory size."""
    from .filters import enrollment_queryset

    queryset = enrollment_queryset(scope) if queryset is None else queryset
    last = None
    while True:
        batch = list(
            (queryset.filter(pk__gt=last) if last else queryset).order_by("pk")[
                :batch_size
            ]
        )
        if not batch:
            break
        yield from gradebook(scope, batch)
        last = batch[-1].pk
