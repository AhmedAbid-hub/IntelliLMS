from datetime import timedelta
from io import BytesIO
from zipfile import ZipFile
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.learning.models import Announcement, Notification, Quiz, Question, Attempt
from apps.learning.serializers import validate_upload


@pytest.mark.django_db
def test_drafts_and_course_notification_audience(world, client_for):
    a = world["a"]
    draft = Announcement.objects.create(
        institute=a["institute"],
        title="Confidential draft",
        body="Draft",
        published=False,
    )
    for role in ["head", "teacher", "student"]:
        assert (
            client_for(a, role).get(f"/api/v1/announcements/{draft.pk}/").status_code
            == 404
        )
    teacher = client_for(a, "teacher")
    response = teacher.post(
        "/api/v1/announcements/",
        {
            "title": "Course notice",
            "body": "Published",
            "offering": str(a["offering"].pk),
            "published": True,
        },
        format="json",
    )
    assert response.status_code == 201
    assert set(
        Notification.objects.filter(title="Course notice").values_list(
            "user_id", flat=True
        )
    ) == {a["teacher"].pk, a["student"].pk}
    assert not Notification.objects.filter(institute=world["b"]["institute"]).exists()


@pytest.mark.django_db
def test_archived_questions_and_attempts_are_read_only(world, client_for):
    a = world["a"]
    quiz = Quiz.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Quiz",
        published=True,
        opens_at=timezone.now() - timedelta(hours=1),
        closes_at=timezone.now() + timedelta(hours=1),
    )
    q = Question.objects.create(
        institute=a["institute"], quiz=quiz, prompt="Q", kind="boolean", answer="true"
    )
    a["offering"].archived = True
    a["offering"].save()
    assert (
        client_for(a, "teacher").delete(f"/api/v1/questions/{q.pk}/").status_code == 400
    )
    attempt = Attempt.objects.create(
        institute=a["institute"],
        quiz=quiz,
        student=a["student"],
        deadline=timezone.now() + timedelta(minutes=5),
    )
    assert (
        client_for(a, "student")
        .post(
            f"/api/v1/attempts/{attempt.pk}/save_answers/",
            {"answers": {str(q.pk): "true"}},
            format="json",
        )
        .status_code
        == 400
    )
    attempt.refresh_from_db()
    assert attempt.answers == {}


def docx(extra=None):
    data = BytesIO()
    with ZipFile(data, "w") as archive:
        archive.writestr(
            "[Content_Types].xml",
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
        )
        archive.writestr(
            "word/document.xml",
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>',
        )
        if extra:
            archive.writestr(extra, b"unsafe")
    return SimpleUploadedFile(
        "work.docx",
        data.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


@pytest.mark.parametrize("entry", ["../secret", "word/vbaProject.bin", "payload.exe"])
def test_docx_rejects_unsafe_archives(entry):
    with pytest.raises(ValidationError):
        validate_upload(docx(entry))


def test_docx_accepts_structured_document_and_rejects_fake_zip():
    file = docx()
    assert validate_upload(file) is file
    assert file.tell() == 0
    with pytest.raises(ValidationError):
        validate_upload(
            SimpleUploadedFile(
                "fake.docx", b"PK\x03\x04not-a-document", content_type=file.content_type
            )
        )
