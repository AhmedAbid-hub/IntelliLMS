from datetime import timedelta
from unittest.mock import patch
import pytest
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.accounts.models import User, Membership
from apps.academics.models import Enrollment, Offering
from apps.learning.models import (
    Assignment,
    Submission,
    Quiz,
    Question,
    Attempt,
    Lesson,
    Material,
    AttendanceSession,
    Attendance,
)
from apps.insights.services import student_features, gradebook


@pytest.mark.django_db
def test_attendance_transaction_and_percentage(world, client_for):
    a = world["a"]
    c = client_for(a, "teacher")
    session = AttendanceSession.objects.create(
        institute=a["institute"], offering=a["offering"], date=timezone.now().date()
    )
    url = f"/api/v1/attendance-sessions/{session.pk}/mark/"
    rows = [
        {"student": str(a["student"].pk), "status": "present"},
        {"student": str(world["b"]["student"].pk), "status": "absent"},
    ]
    assert c.post(url, {"records": rows}, format="json").status_code == 400
    assert Attendance.objects.count() == 0
    assert c.post(url, {"records": rows[:1]}, format="json").status_code == 200
    assert c.post(url, {"records": rows[:1]}, format="json").status_code == 200
    assert Attendance.objects.count() == 1
    result = client_for(a, "student").get("/api/v1/analytics/")
    assert result.status_code == 200
    assert result.data["attendance_pct"] == 100
    assert (
        client_for(a, "student")
        .post(url, {"records": rows[:1]}, format="json")
        .status_code
        == 403
    )


@pytest.mark.django_db
def test_private_file_and_future_lesson(world, client_for):
    a = world["a"]
    c = client_for(a, "teacher")
    lesson = Lesson.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Private",
        published=False,
    )
    assert (
        client_for(a, "student").get(f"/api/v1/lessons/{lesson.pk}/").status_code == 404
    )
    data = {
        "offering": str(a["offering"].pk),
        "lesson": str(lesson.pk),
        "title": "File",
        "file": SimpleUploadedFile(
            "bad.pdf", b"not pdf", content_type="application/pdf"
        ),
    }
    assert c.post("/api/v1/materials/", data, format="multipart").status_code == 400
    data["file"] = SimpleUploadedFile(
        "notes.pdf", b"%PDF-1.4 demo", content_type="application/pdf"
    )
    result = c.post("/api/v1/materials/", data, format="multipart")
    assert result.status_code == 201
    mid = result.data["id"]
    assert result.data["file"] == f"/api/v1/materials/{mid}/download/"
    assert client_for(a, "student").get(result.data["file"]).status_code == 404
    lesson.published = True
    lesson.visible_at = timezone.now() + timedelta(days=1)
    lesson.save()
    assert client_for(a, "student").get(result.data["file"]).status_code == 404
    lesson.visible_at = None
    lesson.save()
    assert client_for(a, "student").get(result.data["file"]).status_code == 200
    assert client_for(world["b"], "teacher").get(result.data["file"]).status_code == 404


@pytest.mark.django_db
def test_deadlines_unreleased_and_student_isolation(world, client_for):
    a = world["a"]
    student = client_for(a, "student")
    teacher = client_for(a, "teacher")
    assignment = Assignment.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Closed",
        published=True,
        due_at=timezone.now() - timedelta(days=1),
    )
    assert (
        student.post(
            f"/api/v1/assignments/{assignment.pk}/submit/", {"text": "late"}
        ).status_code
        == 400
    )
    assignment.allow_late = True
    assignment.save()
    r = student.post(f"/api/v1/assignments/{assignment.pk}/submit/", {"text": "late"})
    assert r.data["late"] is True
    sid = r.data["id"]
    for value in [-1, 101, "NaN", "Infinity"]:
        assert (
            teacher.post(
                f"/api/v1/submissions/{sid}/grade/", {"marks": value}
            ).status_code
            == 400
        )
    other = User.objects.create_user(
        username="other", email="other@example.test", password="temporary-strong-123"
    )
    Membership.objects.create(user=other, institute=a["institute"], role="student")
    Enrollment.objects.create(
        institute=a["institute"], offering=a["offering"], student=other
    )
    response = client_for({**a, "student": other}, "student").get(
        f"/api/v1/submissions/{sid}/"
    )
    assert response.status_code == 404


@pytest.mark.django_db
def test_expired_quiz_and_manual_marking(world, client_for):
    a = world["a"]
    c = client_for(a, "student")
    teacher = client_for(a, "teacher")
    quiz = Quiz.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Test",
        published=True,
        opens_at=timezone.now() - timedelta(hours=1),
        closes_at=timezone.now() + timedelta(hours=1),
    )
    q = Question.objects.create(
        institute=a["institute"], quiz=quiz, prompt="Explain", kind="short", marks=5
    )
    attempt = c.post(f"/api/v1/quizzes/{quiz.pk}/start/").data["id"]
    assert (
        c.post(
            f"/api/v1/attempts/{attempt}/save_answers/",
            {"answers": {str(q.pk): "Saved answer"}},
            format="json",
        ).status_code
        == 200
    )
    Attempt.objects.filter(pk=attempt).update(
        deadline=timezone.now() - timedelta(seconds=1)
    )
    result = c.post(
        f"/api/v1/attempts/{attempt}/submit/",
        {"answers": {str(q.pk): "Too late"}},
        format="json",
    )
    assert result.data["expired"] is True
    assert result.data["answers"][str(q.pk)] == "Saved answer"
    assert result.data["marks"] is None
    assert (
        teacher.post(
            f"/api/v1/attempts/{attempt}/grade/",
            {"manual_marks": {str(q.pk): 4}},
            format="json",
        ).data["marks"]
        == 4
    )
    assert c.get(f"/api/v1/attempts/{attempt}/").data["marks"] is None
    assert (
        teacher.patch(f"/api/v1/questions/{q.pk}/", {"answer": "changed"}).status_code
        == 400
    )


@pytest.mark.django_db
def test_predictions_require_scope_and_data(world, client_for):
    a = world["a"]
    assert client_for(a, "student").get("/api/v1/predictions/").status_code == 403
    assert (
        client_for(a, "teacher")
        .post(
            "/api/v1/predictions/",
            {
                "offering": str(world["b"]["offering"].pk),
                "student": str(world["b"]["student"].pk),
            },
        )
        .status_code
        == 400
    )
    with patch("ml.inference.status", return_value={"status": "ready"}):
        response = client_for(a, "teacher").post(
            "/api/v1/predictions/",
            {"offering": str(a["offering"].pk), "student": str(a["student"].pk)},
        )
    assert response.status_code == 200
    assert response.data["status"] == "insufficient_data"


@pytest.mark.django_db
def test_related_tenant_validation_and_malformed_ids(world, client_for):
    a = world["a"]
    c = client_for(a, "admin")
    response = c.post(
        "/api/v1/offerings/",
        {
            "title": "Invalid",
            "course": str(a["course"].pk),
            "term": str(world["b"]["term"].pk),
        },
        format="json",
    )
    assert response.status_code == 400
    assert (
        c.post(
            "/api/v1/auth/select-institute/", {"institute_id": "invalid"}
        ).status_code
        == 400
    )
    assert c.post("/api/v1/units/", {"name": "Computing"}).status_code == 400


@pytest.mark.django_db
def test_weighted_released_scores(world, client_for):
    a = world["a"]
    for score, released in [(80, True), (10, False)]:
        assignment = Assignment.objects.create(
            institute=a["institute"],
            offering=a["offering"],
            title="Score",
            published=True,
            due_at=timezone.now(),
        )
        Submission.objects.create(
            institute=a["institute"],
            assignment=assignment,
            student=a["student"],
            marks=score,
            released=released,
        )
    response = client_for(a, "student").get("/api/v1/grades/")
    assert response.data["results"][0]["score"] == 80
    assert response.data["results"][0]["provisional"] is True
    assert client_for(a, "student").get("/api/v1/reports/").status_code == 403


@pytest.mark.django_db
def test_disabled_membership_and_institute(world, client_for):
    a = world["a"]
    client = client_for(a, "teacher")
    Membership.objects.filter(user=a["teacher"]).update(active=False)
    assert client.get("/api/v1/offerings/").status_code == 403
    a["institute"].active = False
    a["institute"].save()
    assert client_for(a, "admin").get("/api/v1/analytics/").status_code == 403
