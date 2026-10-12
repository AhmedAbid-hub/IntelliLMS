from django.db.models import Avg, Count, Q
from django.utils import timezone
from apps.academics.models import Enrollment
from apps.learning.models import (
    Attendance,
    Assignment,
    Submission,
    Attempt,
    Lesson,
    Completion,
    Quiz,
    ManualGrade,
)
from .models import Activity


def student_features(offering, student):
    attendance = Attendance.objects.filter(
        session__offering=offering, student=student
    ).exclude(status="excused")
    submissions = Submission.objects.filter(
        assignment__offering=offering,
        student=student,
        marks__isnull=False,
        released=True,
    )
    attempts = Attempt.objects.filter(
        quiz__offering=offering,
        student=student,
        submitted_at__isnull=False,
        marks__isnull=False,
        quiz__released=True,
    )
    assignments = list(submissions.select_related("assignment"))
    quizzes = list(attempts.select_related("quiz"))
    lesson_count = (
        Lesson.objects.filter(offering=offering, published=True)
        .filter(Q(visible_at__isnull=True) | Q(visible_at__lte=timezone.now()))
        .count()
    )
    completed = (
        Completion.objects.filter(
            lesson__offering=offering, student=student, lesson__published=True
        )
        .filter(
            Q(lesson__visible_at__isnull=True)
            | Q(lesson__visible_at__lte=timezone.now())
        )
        .count()
    )
    available = Assignment.objects.filter(offering=offering, published=True).count()
    submitted = Submission.objects.filter(
        assignment__offering=offering, assignment__published=True, student=student
    ).count()
    quiz_scores = []
    for attempt in quizzes:
        maximum = sum(q.marks for q in attempt.quiz.questions.all())
        if maximum:
            quiz_scores.append(float(attempt.marks) / maximum * 100)
    return {
        "attendance_pct": (
            round(
                attendance.filter(status__in=["present", "late"]).count()
                / attendance.count()
                * 100,
                2,
            )
            if attendance.exists()
            else None
        ),
        "assignment_pct": (
            round(
                sum(float(s.marks) / s.assignment.max_marks * 100 for s in assignments)
                / len(assignments),
                2,
            )
            if assignments
            else None
        ),
        "quiz_pct": (
            round(sum(quiz_scores) / len(quiz_scores), 2) if quiz_scores else None
        ),
        "completion_pct": (
            round(completed / lesson_count * 100, 2) if lesson_count else None
        ),
        "activity_count": Activity.objects.filter(
            offering=offering, user=student
        ).count(),
    }, {
        "attendance_records": attendance.count(),
        "graded_assignments": len(assignments),
        "graded_quizzes": len(quizzes),
        "published_lessons": lesson_count,
        "completed_lessons": completed,
        "available_assignments": available,
        "submitted_assignments": submitted,
        "assignment_completion_pct": (
            round(submitted / available * 100, 1) if available else None
        ),
    }


# Public compatibility import; bulk aggregation lives in its own module.
from .gradebook import gradebook
