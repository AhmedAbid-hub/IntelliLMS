"""Verify configured grading policies without introducing new grading rules."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.learning.models import (
    Assignment, Submission, Quiz, Question, Attempt, ManualGrade,
    Lesson, Completion, AttendanceSession, Attendance,
)


@pytest.mark.django_db
def test_released_categories_weights_bands_and_activity_are_independent(world, client_for):
    a = world["a"]
    common = {"institute": a["institute"], "offering": a["offering"]}
    now = timezone.now()
    a["offering"].assignment_weight = 20
    a["offering"].quiz_weight = 30
    a["offering"].manual_weight = 50
    a["offering"].save()
    rules = {
        "pass_mark": 50,
        "missing_category_policy": "normalize",
        "bands": [
            {"label": "High", "minimum": 80, "points": 4},
            {"label": "Pass", "minimum": 50, "points": 2},
            {"label": "Low", "minimum": 0, "points": 0},
        ],
    }
    a["institute"].grading_rules = rules
    a["institute"].save()
    assignment = Assignment.objects.create(**common, title="Essay", max_marks=50, published=True, due_at=now)
    submission = Submission.objects.create(institute=a["institute"], assignment=assignment, student=a["student"], marks=40, released=True)
    quiz = Quiz.objects.create(**common, title="Quiz", published=True, released=True, opens_at=now, closes_at=now + timedelta(hours=1))
    Question.objects.create(institute=a["institute"], quiz=quiz, prompt="Explain", kind="short", marks=20)
    Attempt.objects.create(institute=a["institute"], quiz=quiz, student=a["student"], submitted_at=now, deadline=quiz.closes_at, marks=12)
    manual = ManualGrade.objects.create(**common, student=a["student"], title="Exam", marks=10, max_marks=25, released=True)
    student = client_for(a, "student")

    def result():
        response = student.get("/api/v1/grades/")
        assert response.status_code == 200, response.data
        assert response.data["count"] == 1
        row = response.data["results"][0]
        assert row["student"] == str(a["student"].pk)
        return row

    row = result()
    assert (row["assignment_pct"], row["quiz_pct"], row["manual_pct"]) == (80, 60, 40)
    assert (row["score"], row["letter_grade"], row["grade_points"], row["meeting_pass_mark"]) == (54, "Pass", 2, True)

    lesson = Lesson.objects.create(**common, title="Lesson", published=True)
    Completion.objects.create(institute=a["institute"], lesson=lesson, student=a["student"])
    session = AttendanceSession.objects.create(**common, date=now.date())
    Attendance.objects.create(institute=a["institute"], session=session, student=a["student"], status="present")
    row = result()
    assert (row["attendance_pct"], row["completion_pct"], row["score"]) == (100, 100, 54)

    quiz.released = False
    quiz.save()
    row = result()
    assert row["quiz_pct"] is None and row["score"] == 51.43
    a["institute"].grading_rules = {**rules, "missing_category_policy": "zero"}
    a["institute"].save()
    row = result()
    assert (row["score"], row["letter_grade"], row["grade_points"]) == (36, "Low", 0)

    manual.released = False
    manual.save()
    submission.released = False
    submission.save()
    row = result()
    assert row["score"] is None and row["letter_grade"] is None
    assert row["attendance_pct"] == row["completion_pct"] == 100
