from datetime import date, timedelta
from types import SimpleNamespace

import pytest
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.academics.models import Offering, Term, Timetable
from apps.academics.serializers import serializer_for
from apps.learning.models import Assignment, Submission, Quiz, Question, Attempt
from apps.learning.serializers import LearningSerializer
from apps.learning.views import AssignmentViewSet, QuizViewSet, QuestionViewSet


@pytest.mark.django_db
@pytest.mark.parametrize("conflict", ["room", "instructor"])
def test_calendar_edit_revalidates_existing_meetings(world, client_for, conflict):
    a = world["a"]
    earlier = Term.objects.create(
        institute=a["institute"],
        year=a["year"],
        name="Spring",
        start=date(2026, 1, 1),
        end=date(2026, 6, 30),
    )
    offering = Offering.objects.create(
        institute=a["institute"],
        term=earlier,
        course=a["course"],
        title="Spring course",
    )
    if conflict == "instructor":
        offering.teachers.add(a["teacher"])
    Timetable.objects.create(
        institute=a["institute"],
        offering=offering,
        day=1,
        start="09:00",
        end="10:00",
        location="room a" if conflict == "room" else "Different room",
    )
    Timetable.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        day=1,
        start="09:30",
        end="10:30",
        location="Room A",
    )
    client = client_for(a, "admin")
    url = f"/api/v1/terms/{earlier.pk}/"
    assert client.patch(url, {"end": "2026-07-31"}).status_code == 200
    assert client.patch(url, {"end": "2026-08-01"}).status_code == 400
    earlier.refresh_from_db()
    assert earlier.end == date(2026, 7, 31)
    assert (
        client_for(world["b"], "admin").patch(url, {"end": "2026-08-01"}).status_code
        == 404
    )
    assert client_for(a, "teacher").patch(url, {"end": "2026-08-01"}).status_code == 403


def prepared(view_class, a, instance, data):
    request = SimpleNamespace(
        user=a["teacher"], session={"institute_id": str(a["institute"].pk)}
    )
    view = view_class()
    view.request = request
    serializer = serializer_for(view.model, LearningSerializer)(
        instance, data=data, partial=instance is not None, context={"request": request}
    )
    serializer.is_valid(raise_exception=True)
    return view, serializer


@pytest.mark.django_db
@pytest.mark.parametrize("change", ["quiz", "question", "new_question"])
def test_attempt_started_after_validation_still_prevents_content_change(world, change):
    a = world["a"]
    now = timezone.now()
    quiz = Quiz.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Before",
        published=True,
        opens_at=now - timedelta(hours=1),
        closes_at=now + timedelta(hours=1),
    )
    question = Question.objects.create(
        institute=a["institute"], quiz=quiz, kind="short", prompt="Before", marks=5
    )
    if change == "quiz":
        view, serializer = prepared(QuizViewSet, a, quiz, {"title": "After"})
    elif change == "question":
        view, serializer = prepared(QuestionViewSet, a, question, {"prompt": "After"})
    else:
        view, serializer = prepared(
            QuestionViewSet,
            a,
            None,
            {"quiz": str(quiz.pk), "kind": "short", "prompt": "Extra", "marks": 5},
        )
    # A committed attempt appears after serializer validation, before persistence.
    Attempt.objects.create(
        institute=a["institute"],
        quiz=quiz,
        student=a["student"],
        deadline=now + timedelta(minutes=10),
    )
    with pytest.raises(ValidationError):
        (view.perform_create if change == "new_question" else view.perform_update)(
            serializer
        )
    quiz.refresh_from_db()
    question.refresh_from_db()
    assert quiz.title == question.prompt == "Before"
    assert quiz.questions.count() == 1


@pytest.mark.django_db
def test_submission_started_after_validation_locks_assignment_maximum(world):
    a = world["a"]
    assignment = Assignment.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Essay",
        due_at=timezone.now() + timedelta(days=1),
    )
    view, serializer = prepared(AssignmentViewSet, a, assignment, {"max_marks": 50})
    Submission.objects.create(
        institute=a["institute"],
        assignment=assignment,
        student=a["student"],
        text="Answer",
    )
    with pytest.raises(ValidationError):
        view.perform_update(serializer)
    assignment.refresh_from_db()
    assert assignment.max_marks == 100
