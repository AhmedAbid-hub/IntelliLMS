from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import pytest
from django.utils import timezone

from apps.accounts.models import Membership
from apps.insights.models import Prediction
from ml import inference, oulad
from tests.test_public_model import records

pytestmark = pytest.mark.django_db
SUMMARY = "/api/v1/predictions/summary/"


@pytest.mark.parametrize("kind", ["school", "college", "university"])
def test_readiness_generation_and_oversight_match_institution_scope(world, client_for, kind):
    a = world["a"]
    a["institute"].kind = kind
    a["institute"].save(update_fields=["kind"])
    records(a)
    teacher = client_for(a, "teacher")
    data = teacher.get(SUMMARY).data
    assert data["learner_course_pairs"] == 0
    assert data["readiness"]["eligible_pairs"] == 1
    assert data["readiness"]["can_generate"]
    oversight = client_for(a, "admin").get(SUMMARY).data["readiness"]
    assert not oversight["can_generate"] and "read-only" in oversight["generation_reason"]
    assert client_for(a, "student").get(SUMMARY).status_code == 403
    assert client_for(a, "student").get("/api/v1/predictions/").status_code == 403
    foreign = teacher.get(SUMMARY + f'?offering={world["b"]["offering"].pk}').data
    assert foreign["readiness"]["courses"] == foreign["readiness"]["learner_course_pairs"] == 0
    payload = {"offering": str(a["offering"].pk), "student": str(a["student"].pk)}
    generated = teacher.post("/api/v1/predictions/", payload)
    assert generated.status_code == 200 and generated.data["status"] == "ready"
    assert teacher.get(SUMMARY).data["learner_course_pairs"] == 1
    assert client_for(world["b"], "admin").get("/api/v1/predictions/").data["count"] == 0


def test_readiness_distinguishes_no_history_no_upcoming_and_no_membership(world, client_for):
    a = world["a"]
    client = client_for(a, "teacher")
    def coverage():
        response = client.get(SUMMARY)
        assert response.status_code == 200
        return response.data["readiness"]
    assert coverage()["insufficient_history_pairs"] == 1
    submissions, upcoming = records(a)
    assert coverage()["eligible_pairs"] == 1
    upcoming.published = False
    upcoming.save(update_fields=["published"])
    assert coverage()["no_upcoming_pairs"] == 1
    submissions[1].released = False
    submissions[1].save(update_fields=["released"])
    assert coverage()["insufficient_history_pairs"] == 1
    assert coverage()["no_upcoming_pairs"] == 0
    Membership.objects.filter(user=a["student"]).update(active=False)
    assert coverage()["learner_course_pairs"] == 0
    assert not coverage()["can_generate"]


def test_readiness_rejects_tied_deadlines_invalid_marks_and_completed_work(world, client_for):
    a = world["a"]
    submissions, upcoming = records(a)
    client = client_for(a, "teacher")
    def coverage():
        return client.get(SUMMARY).data["readiness"]
    original_due = submissions[1].assignment.due_at
    submissions[1].assignment.due_at = submissions[0].assignment.due_at
    submissions[1].assignment.save(update_fields=["due_at"])
    assert coverage()["insufficient_history_pairs"] == 1
    submissions[1].assignment.due_at = original_due
    submissions[1].assignment.save(update_fields=["due_at"])
    submissions[1].marks = 1000
    submissions[1].save(update_fields=["marks"])
    assert coverage()["eligible_pairs"] == 0
    submissions[1].marks = 25
    submissions[1].save(update_fields=["marks"])
    from apps.learning.models import Submission
    Submission.objects.create(institute=a["institute"], assignment=upcoming, student=a["student"])
    assert coverage()["no_upcoming_pairs"] == 1


def test_head_coverage_requires_teaching_workspace_and_active_assignment(world, client_for):
    a = world["a"]
    records(a)
    head = client_for(a, "head")
    assert not head.get(SUMMARY).data["readiness"]["can_generate"]
    Membership.objects.filter(user=a["head"]).update(can_teach=True)
    a["offering"].teachers.add(a["head"])
    data = head.get(SUMMARY).data["readiness"]
    assert not data["can_generate"] and "My Teaching" in data["generation_reason"]
    assert head.post("/api/v1/auth/select-workspace/", {"academic_workspace": "teaching"}).status_code == 200
    assert head.get(SUMMARY).data["readiness"]["can_generate"]
    a["offering"].teachers.remove(a["head"])
    assert not head.get(SUMMARY).data["readiness"]["can_generate"]


def test_current_model_summary_survives_newer_legacy_history_and_filters(world, client_for):
    a = world["a"]
    metadata = inference.status()
    for version, category, offset in [(metadata["version"], "high", 0), ("legacy", "low", 1)]:
        prediction = Prediction.objects.create(institute=a["institute"], offering=a["offering"], student=a["student"],
            probability=.5, category=category, version=version, features={}, warning="test fixture")
        Prediction.objects.filter(pk=prediction.pk).update(created_at=timezone.now() + timedelta(seconds=offset))
    admin = client_for(a, "admin")
    data = admin.get(SUMMARY + f'?term={a["term"].pk}').data
    assert data["distribution"] == {"high": 1, "moderate": 0, "low": 0}
    assert data["readiness"]["historical_estimates"] == 1
    assert admin.get(SUMMARY + f'?term={world["b"]["term"].pk}').data["learner_course_pairs"] == 0
    assert admin.get("/api/v1/predictions/?page_size=1").data["count"] == 2
    assert admin.get("/api/v1/predictions/?search=not-a-learner").data["count"] == 0
    with patch("ml.inference.status", return_value={"status": "model_unavailable", "detail": "Verify the trusted model."}):
        unavailable = admin.get(SUMMARY).data
    assert unavailable["learner_course_pairs"] == 0
    assert unavailable["readiness"]["historical_estimates"] == 2
    assert Prediction.objects.count() == 2


def test_closed_course_readiness_is_read_only(world, client_for):
    a = world["a"]
    records(a)
    a["term"].status = "closed"
    a["term"].save(update_fields=["status"])
    data = client_for(a, "teacher").get(SUMMARY).data["readiness"]
    assert data["courses"] == 1 and data["open_courses"] == 0
    assert not data["can_generate"] and "closed" in data["generation_reason"]


@pytest.mark.parametrize("probability,category", [(.199, "low"), (.2, "moderate"), (.399, "moderate"), (.4, "high")])
def test_active_model_risk_threshold_boundaries(probability, category):
    metadata = inference.status()
    model = SimpleNamespace(feature_names_in_=oulad.FEATURES, classes_=np.array([0, 1]),
                            predict_proba=lambda _: np.array([[1-probability, probability]]))
    result = inference.infer(dict(zip(oulad.FEATURES, [50., 55.])),
        {"eligible_assignments": 2, "future_assignments": 1}, runtime={"metadata": metadata, "model": model})
    assert result["probability"] == probability and result["category"] == category


def test_broken_pipeline_schema_returns_safe_model_error():
    result = inference.infer(dict(zip(oulad.FEATURES, [50., 55.])),
        {"eligible_assignments": 2, "future_assignments": 1},
        runtime={"metadata": inference.status(), "model": object()})
    assert result["status"] == "model_unavailable"


def test_invalid_threshold_metadata_is_unavailable(tmp_path, monkeypatch):
    import json
    metadata = inference.status()
    metadata["thresholds"] = {"moderate": .7, "high": .2}
    (tmp_path / "metadata.json").write_text(json.dumps(metadata))
    monkeypatch.setattr(inference, "ARTIFACTS", tmp_path)
    assert inference.status()["status"] == "model_unavailable"
