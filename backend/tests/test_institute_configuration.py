from datetime import timedelta
from types import SimpleNamespace
import pytest
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from apps.accounts.configuration import validate_grading_rules, validate_terminology
from apps.accounts.scope import Scope
from apps.learning.models import Quiz, Question, Attempt, Assignment, Submission
from apps.insights.gradebook import gradebook


@pytest.mark.parametrize(
    "rules",
    [
        {"pass_mark": True},
        {"bands": [{"label": "A", "minimum": 80, "points": 4}]},
        {"bands": [{"label": "A", "minimum": 0, "points": float("nan")}]},
        {"quiz_attempt_policy": "invent"},
        {"missing_category_policy": "invent"},
        {
            "bands": [
                {"label": "A", "minimum": 0, "points": 4},
                {"label": "A", "minimum": 0, "points": 0},
            ]
        },
    ],
)
def test_reject_invalid_grade_schemes(rules):
    with pytest.raises(ValidationError):
        validate_grading_rules(rules)


def test_terminology_validation():
    assert (
        validate_terminology({"program": " Grade ", "program_plural": "Grades"})[
            "program"
        ]
        == "Grade"
    )
    for value in [{"secret": "no"}, {"term": None}, {"unit": " "}]:
        with pytest.raises(ValidationError):
            validate_terminology(value)


@pytest.mark.django_db
def test_grading_policy_bands_and_settings_permissions(world, client_for):
    a = world["a"]
    now = timezone.now()
    quiz = Quiz.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Repeat",
        published=True,
        released=True,
        opens_at=now - timedelta(days=1),
        closes_at=now + timedelta(days=1),
    )
    Question.objects.create(
        institute=a["institute"],
        quiz=quiz,
        prompt="Q",
        kind="boolean",
        marks=100,
        answer="true",
    )
    for i, marks in enumerate([90, 50]):
        Attempt.objects.create(
            institute=a["institute"],
            quiz=quiz,
            student=a["student"],
            marks=marks,
            submitted_at=now + timedelta(seconds=i),
            deadline=now + timedelta(hours=1),
        )
    scope = Scope(
        SimpleNamespace(
            user=a["student"], session={"institute_id": str(a["institute"].pk)}
        )
    )
    rules = {
        "pass_mark": 60,
        "bands": [
            {"label": "A", "minimum": 80, "points": 4},
            {"label": "B", "minimum": 60, "points": 3},
            {"label": "F", "minimum": 0, "points": 0},
        ],
    }
    for policy, score, letter in [
        ("mean", 70, "B"),
        ("best", 90, "A"),
        ("latest", 50, "F"),
    ]:
        scope.institute.grading_rules = {**rules, "quiz_attempt_policy": policy}
        row = gradebook(scope)[0]
        assert row["score"] == score
        assert row["letter_grade"] == letter
    scope.institute.grading_rules = {
        **rules,
        "quiz_attempt_policy": "best",
        "missing_category_policy": "zero",
    }
    assert gradebook(scope)[0]["score"] == 36
    url = f'/api/v1/institutes/{a["institute"].pk}/'
    data = {
        "grading_rules": rules,
        "terminology": {"program": "Grade", "program_plural": "Grades"},
    }
    assert client_for(a, "teacher").patch(url, data, format="json").status_code == 403
    assert client_for(a, "admin").patch(url, data, format="json").status_code == 200
    from apps.insights.models import Audit

    audit = Audit.objects.get(action="Institute.update", institute=a["institute"])
    assert audit.actor == a["admin"]
    assert set(audit.detail["fields"]) == {"grading_rules", "terminology"}
    own = client_for(a, "student").get("/api/v1/auth/me/").data
    assert own["institute_profile"]["terminology"]["program"] == "Grade"
    assert (
        client_for(world["b"], "admin").patch(url, data, format="json").status_code
        == 404
    )
