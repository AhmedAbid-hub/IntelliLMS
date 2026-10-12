from datetime import timedelta
import pytest
from django.utils import timezone
from apps.insights.report_contracts import (
    DashboardResult, GradePage, TrendsResult, RiskResult, ModelStatusResult, PlatformResult,
)
from apps.learning.models import Assignment, Submission


def assert_contract(serializer_class, response):
    assert response.status_code == 200
    body = response.json()
    serializer = serializer_class(data=body)
    assert serializer.is_valid(), serializer.errors
    # Extra top-level fields must be documented too, rather than silently discarded.
    assert set(body) <= set(serializer.fields)
    return body


@pytest.mark.django_db
def test_report_responses_match_contracts_for_every_tenant_role(world, client_for):
    a = world["a"]
    assignment = Assignment.objects.create(
        institute=a["institute"], offering=a["offering"], title="Contract assessment",
        published=True, due_at=timezone.now() + timedelta(days=1),
    )
    Submission.objects.create(
        institute=a["institute"], assignment=assignment, student=a["student"], marks=75, released=True,
    )
    for role in ["admin", "head", "teacher", "student"]:
        client = client_for(a, role)
        for path, contract in [("analytics/", DashboardResult), ("grades/", GradePage), ("analytics/trends/", TrendsResult)]:
            assert_contract(contract, client.get("/api/v1/" + path))
        risk = client.get("/api/v1/predictions/summary/")
        if role == "student":
            assert risk.status_code == 403
        else:
            assert_contract(RiskResult, risk)
    a["admin"].is_superuser = True
    a["admin"].save(update_fields=["is_superuser"])
    client = client_for(a, "admin")
    assert_contract(PlatformResult, client.get("/api/v1/platform/"))
    assert client.get("/api/v1/analytics/").status_code == 403


@pytest.mark.django_db
def test_model_status_contract_includes_unavailable_state(world, client_for, monkeypatch, tmp_path):
    from ml import inference
    monkeypatch.setattr(inference, "ARTIFACTS", tmp_path)
    response = client_for(world["a"], "teacher").get("/api/v1/model-status/")
    assert assert_contract(ModelStatusResult, response)["status"] == "model_unavailable"
    assert client_for(world["a"], "student").get("/api/v1/model-status/").status_code == 403


@pytest.mark.django_db
def test_computed_crud_labels_and_attempt_responses_are_documented(world, client_for):
    from drf_spectacular.generators import SchemaGenerator
    from apps.learning.models import Quiz, Question

    schema = SchemaGenerator().get_schema(request=None, public=True)
    components = schema["components"]["schemas"]
    for name, fields in {
        "Offering": ["course_label", "term_label", "section_label"],
        "Term": ["year_label"], "Program": ["unit_label"],
        "Section": ["program_label"], "Enrollment": ["student_label", "offering_label"],
        "Membership": ["unit_label"], "ManualGrade": ["student_label", "offering_label"],
    }.items():
        for field in fields:
            assert components[name]["properties"][field]["readOnly"] is True
            assert components[name]["properties"][field]["type"] == "string"
    assert components["Quiz"]["properties"]["has_attempts"]["readOnly"] is True
    attempt_path = schema["paths"]["/api/v1/attempts/{id}/"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    assert attempt_path["$ref"].endswith("/AttemptResult")

    a = world["a"]
    quiz = Quiz.objects.create(institute=a["institute"], offering=a["offering"], title="Contract quiz", published=True, opens_at=timezone.now() - timedelta(hours=1), closes_at=timezone.now() + timedelta(hours=1))
    Question.objects.create(institute=a["institute"], quiz=quiz, kind="short", prompt="Explain", marks=5)
    student = client_for(a, "student")
    attempt = student.post(f"/api/v1/quizzes/{quiz.pk}/start/").data
    from apps.learning.contracts import AttemptResult
    assert_contract(AttemptResult, student.get(f"/api/v1/attempts/{attempt['id']}/"))
    student_quiz = student.get(f"/api/v1/quizzes/{quiz.pk}/").data
    assert "has_attempts" not in student_quiz
    assert "answer" not in student.get(f"/api/v1/questions/?quiz={quiz.pk}").data["results"][0]
    teacher_quiz = client_for(a, "teacher").get(f"/api/v1/quizzes/{quiz.pk}/").data
    assert teacher_quiz["has_attempts"] is True
    for endpoint, component in [("offerings", "Offering"), ("terms", "Term"), ("memberships", "Membership"), ("quizzes", "Quiz")]:
        rows = client_for(a, "admin").get(f"/api/v1/{endpoint}/").data["results"]
        assert rows
        for row in rows:
            assert set(row) <= set(components[component]["properties"])
