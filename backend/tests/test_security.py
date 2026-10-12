import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from apps.learning.models import Assignment, Quiz, Question, Submission
from apps.academics.models import Offering, Unit, Course


@pytest.mark.django_db
def test_login_and_scope(world):
    client = APIClient(enforce_csrf_checks=True)
    assert (
        client.post(
            "/api/v1/auth/login/",
            {"username": "astudent", "password": "Strong-demo-pass42!"},
        ).status_code
        == 403
    )
    client.get("/api/v1/auth/csrf/")
    response = client.post(
        "/api/v1/auth/login/",
        {"username": "astudent", "password": "Strong-demo-pass42!"},
        HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
    )
    assert response.status_code == 200
    assert response.data["institute_id"] == str(world["a"]["institute"].id)
    assert (
        client.post(
            "/api/v1/auth/select-institute/",
            {"institute_id": str(world["b"]["institute"].pk)},
            HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
        ).status_code
        == 403
    )


@pytest.mark.django_db
@pytest.mark.parametrize("role", ["admin", "head", "teacher", "student"])
def test_tenant_isolation(world, client_for, role):
    client = client_for(world["a"], role)
    b = world["b"]
    assert client.get(f'/api/v1/offerings/{b["offering"].id}/').status_code == 404
    assert client.get("/api/v1/offerings/").data["count"] == 1
    response = client.post(
        "/api/v1/enrollments/",
        {"offering": str(world["a"]["offering"].pk), "student": str(b["student"].pk)},
        format="json",
    )
    assert response.status_code in [400, 403]


@pytest.mark.django_db
def test_role_and_department_boundaries(world, client_for):
    a = world["a"]
    unit = Unit.objects.create(institute=a["institute"], name="Physics")
    course = Course.objects.create(
        institute=a["institute"], unit=unit, code="PHY", name="Physics"
    )
    other = Offering.objects.create(
        institute=a["institute"], course=course, term=a["term"], title="Other"
    )
    for role in ["head", "teacher", "student"]:
        assert (
            client_for(a, role).get(f"/api/v1/offerings/{other.pk}/").status_code == 404
        )
    assert (
        client_for(a, "student")
        .post("/api/v1/lessons/", {"offering": str(a["offering"].pk), "title": "Hack"})
        .status_code
        == 403
    )


@pytest.mark.django_db
def test_assignment_release_and_ownership(world, client_for):
    a = world["a"]
    student = client_for(a, "student")
    teacher = client_for(a, "teacher")
    assignment = Assignment.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Essay",
        due_at=timezone.now() + timedelta(days=1),
        published=True,
    )
    response = student.post(
        f"/api/v1/assignments/{assignment.pk}/submit/", {"text": "My answer"}
    )
    assert response.status_code == 201
    sid = response.data["id"]
    original_timestamp = Submission.objects.get(pk=sid).submitted_at
    assert (
        student.post(
            f"/api/v1/assignments/{assignment.pk}/submit/", {"text": "Again"}
        ).status_code
        == 400
    )
    assert (
        student.post(f"/api/v1/submissions/{sid}/grade/", {"marks": 99}).status_code
        == 403
    )
    assert (
        teacher.post(
            f"/api/v1/submissions/{sid}/grade/",
            {"marks": 81, "feedback": "Good", "released": False},
            format="json",
        ).status_code
        == 200
    )
    assert student.get(f"/api/v1/submissions/{sid}/").data["marks"] is None
    assert (
        teacher.post(
            f"/api/v1/submissions/{sid}/grade/",
            {"marks": 81, "feedback": "Good", "released": True},
            format="json",
        ).status_code
        == 200
    )
    assert student.get(f"/api/v1/submissions/{sid}/").data["marks"] == "81.00"
    assert Submission.objects.get(pk=sid).submitted_at == original_timestamp
    assert (
        client_for(world["b"], "teacher").get(f"/api/v1/submissions/{sid}/").status_code
        == 404
    )


@pytest.mark.django_db
def test_quiz_grade_and_limit(world, client_for):
    a = world["a"]
    client = client_for(a, "student")
    quiz = Quiz.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Quiz",
        published=True,
        opens_at=timezone.now() - timedelta(hours=1),
        closes_at=timezone.now() + timedelta(hours=1),
    )
    question = Question.objects.create(
        institute=a["institute"],
        quiz=quiz,
        prompt="2+2?",
        kind="mcq",
        options=["3", "4"],
        answer="4",
        marks=5,
    )
    assert "answer" not in client.get("/api/v1/questions/").data["results"][0]
    result = client.post(f"/api/v1/quizzes/{quiz.pk}/start/")
    assert result.status_code == 201
    attempt = result.data["id"]
    result = client.post(
        f"/api/v1/attempts/{attempt}/submit/",
        {"answers": {str(question.pk): "4"}},
        format="json",
    )
    assert result.status_code == 200
    assert result.data["marks"] is None
    quiz.released = True
    quiz.save()
    assert client.get(f"/api/v1/attempts/{attempt}/").data["marks"] == 5
    assert client.post(f"/api/v1/quizzes/{quiz.pk}/start/").status_code == 400
