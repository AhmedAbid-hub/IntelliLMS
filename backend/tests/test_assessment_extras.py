from datetime import timedelta
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from apps.learning.models import (
    Quiz,
    Question,
    Attempt,
    Notification,
    Submission,
    Assignment,
)


@pytest.mark.django_db
def test_assignment_resource_remains_private(world, client_for, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    a = world["a"]
    teacher = client_for(a, "teacher")
    data = {
        "offering": str(a["offering"].pk),
        "title": "Resources",
        "due_at": (timezone.now() + timedelta(days=1)).isoformat(),
        "file": SimpleUploadedFile(
            "guide.pdf", b"%PDF-1.4 guide", content_type="application/pdf"
        ),
    }
    response = teacher.post("/api/v1/assignments/", data, format="multipart")
    assert response.status_code == 201
    url = response.data["file"]
    assert url == f"/api/v1/assignments/{response.data['id']}/download/"
    assert client_for(a, "student").get(url).status_code == 404
    assert (
        teacher.patch(
            f"/api/v1/assignments/{response.data['id']}/",
            {"published": True},
            format="json",
        ).status_code
        == 200
    )
    result = client_for(a, "student").get(url)
    assert result.status_code == 200
    assert b"".join(result.streaming_content) == b"%PDF-1.4 guide"
    assert client_for(world["b"], "student").get(url).status_code == 404
    assert (
        teacher.patch(
            f"/api/v1/assignments/{response.data['id']}/",
            {
                "file": SimpleUploadedFile(
                    "bad.pdf", b"bad", content_type="application/pdf"
                )
            },
            format="multipart",
        ).status_code
        == 400
    )


@pytest.mark.django_db
def test_quiz_release_notifications_and_history_permissions(world, client_for):
    a = world["a"]
    quiz = Quiz.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Review",
        published=True,
        opens_at=timezone.now() - timedelta(days=1),
        closes_at=timezone.now() + timedelta(days=1),
    )
    question = Question.objects.create(
        institute=a["institute"], quiz=quiz, prompt="Explain", kind="short", marks=10
    )
    attempt = Attempt.objects.create(
        institute=a["institute"],
        quiz=quiz,
        student=a["student"],
        deadline=timezone.now() + timedelta(minutes=10),
        submitted_at=timezone.now(),
    )
    teacher = client_for(a, "teacher")
    assert (
        teacher.post(
            f"/api/v1/attempts/{attempt.pk}/grade/",
            {"manual_marks": {str(question.pk): 8}},
            format="json",
        ).status_code
        == 200
    )
    assert Notification.objects.count() == 0
    url = f"/api/v1/quizzes/{quiz.pk}/"
    assert teacher.get(url).data["has_attempts"] is True
    assert teacher.patch(url, {"released": True}, format="json").status_code == 200
    assert Notification.objects.filter(user=a["student"]).count() == 1
    assert teacher.patch(url, {"released": True}, format="json").status_code == 200
    assert Notification.objects.count() == 1
    history = f"/api/v1/attempts/{attempt.pk}/grade-history/"
    response = teacher.get(history)
    assert response.status_code == 200
    assert float(response.data["results"][0]["detail"]["marks"]) == 8
    assert client_for(a, "student").get(history).status_code == 403
    assert client_for(world["b"], "teacher").get(history).status_code == 404
    a["offering"].archived = True
    a["offering"].save()
    assert (
        teacher.post(
            f"/api/v1/attempts/{attempt.pk}/grade/",
            {"manual_marks": {str(question.pk): 9}},
            format="json",
        ).status_code
        == 400
    )
