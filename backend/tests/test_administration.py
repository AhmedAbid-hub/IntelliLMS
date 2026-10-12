import pytest
from datetime import timedelta
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from apps.accounts.models import User, Membership
from apps.learning.models import (
    Assignment,
    Notification,
    ManualGrade,
    Quiz,
    BankQuestion,
)


@pytest.mark.django_db
def test_csv_is_atomic_and_role_limited(world, client_for):
    c = client_for(world["a"], "admin")
    csv = b"username,email,role,first_name\nnew1,new1@example.test,student,New\nnew2,invalid,teacher,New\n"
    response = c.post(
        "/api/v1/memberships/import-csv/",
        {"file": SimpleUploadedFile("people.csv", csv, content_type="text/csv")},
        format="multipart",
    )
    assert response.status_code == 400
    assert response.data["errors"][0]["line"] == 3
    assert not User.objects.filter(username="new1").exists()
    csv = b"username,email,role,first_name\nnew1,new1@example.test,student,New\n"
    response = c.post(
        "/api/v1/memberships/import-csv/",
        {"file": SimpleUploadedFile("people.csv", csv, content_type="text/csv")},
        format="multipart",
    )
    assert response.status_code == 201
    assert response.data["created"] == 1
    assert (
        Membership.objects.get(user__username="new1").institute
        == world["a"]["institute"]
    )


@pytest.mark.django_db
def test_deadline_reminders_are_idempotent(world):
    a = world["a"]
    Assignment.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Soon",
        due_at=timezone.now() + timedelta(hours=5),
        published=True,
    )
    call_command("notify_deadlines")
    call_command("notify_deadlines")
    assert Notification.objects.filter(user=a["student"]).count() == 1


@pytest.mark.django_db
def test_manual_grade_release_weights_and_scope(world, client_for):
    a = world["a"]
    teacher = client_for(a, "teacher")
    student = client_for(a, "student")
    data = {
        "offering": str(a["offering"].pk),
        "student": str(a["student"].pk),
        "title": "Oral exam",
        "marks": 70,
        "max_marks": 100,
        "released": False,
    }
    response = teacher.post("/api/v1/manual-grades/", data, format="json")
    assert response.status_code == 201
    mid = response.data["id"]
    assert student.get("/api/v1/manual-grades/").data["count"] == 0
    assert (
        teacher.patch(
            f"/api/v1/manual-grades/{mid}/", {"released": True}, format="json"
        ).status_code
        == 200
    )
    assert student.get("/api/v1/manual-grades/").data["count"] == 1
    assert student.post("/api/v1/manual-grades/", data, format="json").status_code in [
        400,
        403,
    ]
    a["offering"].assignment_weight = 0
    a["offering"].quiz_weight = 0
    a["offering"].manual_weight = 100
    a["offering"].save()
    assert student.get("/api/v1/grades/").data["results"][0]["score"] == 70
    assert (
        client_for(world["b"], "teacher")
        .get(f"/api/v1/manual-grades/{mid}/")
        .status_code
        == 404
    )


@pytest.mark.django_db
def test_question_bank_is_private_and_copy_is_scoped(world, client_for):
    a = world["a"]
    teacher = client_for(a, "teacher")
    response = teacher.post(
        "/api/v1/question-bank/",
        {"prompt": "True?", "kind": "boolean", "answer": "true", "marks": 3},
        format="json",
    )
    assert response.status_code == 201
    bid = response.data["id"]
    assert client_for(a, "student").get("/api/v1/question-bank/").status_code == 403
    b = world["b"]
    foreign = Quiz.objects.create(
        institute=b["institute"],
        offering=b["offering"],
        title="Foreign",
        opens_at=timezone.now(),
        closes_at=timezone.now() + timedelta(days=1),
    )
    assert (
        teacher.post(
            f"/api/v1/question-bank/{bid}/copy-to-quiz/", {"quiz": str(foreign.pk)}
        ).status_code
        == 400
    )
    own = Quiz.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Own",
        opens_at=timezone.now(),
        closes_at=timezone.now() + timedelta(days=1),
    )
    assert (
        teacher.post(
            f"/api/v1/question-bank/{bid}/copy-to-quiz/", {"quiz": str(own.pk)}
        ).status_code
        == 201
    )
    assert own.questions.get().answer == "true"
