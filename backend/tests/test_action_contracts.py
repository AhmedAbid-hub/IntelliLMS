from datetime import timedelta
import pytest
from django.utils import timezone
from apps.learning.models import Assignment, Submission, Quiz, Question


@pytest.mark.django_db
def test_grade_payload_rejects_coercion_truncation_and_nonfinite_marks(
    world, client_for
):
    a = world["a"]
    assignment = Assignment.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Essay",
        published=True,
        due_at=timezone.now() + timedelta(days=1),
    )
    submission = Submission.objects.create(
        institute=a["institute"],
        assignment=assignment,
        student=a["student"],
        text="Answer",
    )
    url = f"/api/v1/submissions/{submission.pk}/grade/"
    teacher = client_for(a, "teacher")
    for patch in [
        {"feedback": {"unexpected": "object"}},
        {"feedback": "x" * 10001},
        {"released": "false"},
        {"marks": "NaN"},
        {"marks": "Infinity"},
        {"marks": "1.234"},
    ]:
        assert (
            teacher.post(url, {"marks": 80, **patch}, format="json").status_code == 400
        )
    submission.refresh_from_db()
    assert submission.marks is None and submission.feedback == ""
    assert (
        client_for(a, "student").post(url, {"marks": 80}, format="json").status_code
        == 403
    )
    response = teacher.post(
        url,
        {"marks": "80.25", "feedback": " Good work ", "released": True},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["feedback"] == " Good work "
    assert response.data["marks"] == "80.25"


@pytest.mark.django_db
def test_answer_contract_preserves_text_and_rejects_nontext(world, client_for):
    a = world["a"]
    quiz = Quiz.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Quiz",
        published=True,
        opens_at=timezone.now() - timedelta(hours=1),
        closes_at=timezone.now() + timedelta(hours=1),
    )
    question = Question.objects.create(
        institute=a["institute"], quiz=quiz, prompt="Explain", kind="short", marks=10
    )
    student = client_for(a, "student")
    attempt = student.post(f"/api/v1/quizzes/{quiz.pk}/start/").data
    url = f"/api/v1/attempts/{attempt['id']}/save_answers/"
    for value in [12, None, {"object": "invalid"}, "x" * 10001]:
        assert (
            student.post(
                url, {"answers": {str(question.pk): value}}, format="json"
            ).status_code
            == 400
        )
    response = student.post(
        url, {"answers": {str(question.pk): "  Reasoning\n"}}, format="json"
    )
    assert response.status_code == 200
    assert response.data["answers"][str(question.pk)] == "  Reasoning\n"
    assert response.data["marks"] is None
