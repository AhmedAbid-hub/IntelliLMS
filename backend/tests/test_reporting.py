from datetime import timedelta
from types import SimpleNamespace

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from apps.accounts.models import Membership, User
from apps.accounts.scope import Scope
from apps.academics.models import Course, Enrollment, Offering, Unit
from apps.learning.models import Assignment, Submission
from apps.insights.gradebook import gradebook
from apps.insights.models import Activity, Prediction


@pytest.mark.django_db
def test_gradebook_batched_queries_and_released_scores(world):
    a = world["a"]
    assignment = Assignment.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Essay",
        published=True,
        due_at=timezone.now() + timedelta(days=1),
    )
    Submission.objects.create(
        institute=a["institute"],
        assignment=assignment,
        student=a["student"],
        marks=80,
        released=True,
    )
    scope = Scope(
        SimpleNamespace(
            user=a["teacher"], session={"institute_id": str(a["institute"].pk)}
        )
    )
    with CaptureQueriesContext(connection) as initial:
        rows = gradebook(scope)
    assert len(rows) == 1
    assert rows[0]["score"] == 80
    assert rows[0]["assignment_completion_pct"] == 100
    for i in range(12):
        student = User.objects.create(
            username=f"extra{i}", email=f"extra{i}@example.test"
        )
        Membership.objects.create(
            institute=a["institute"], user=student, role="student"
        )
        Enrollment.objects.create(
            institute=a["institute"], offering=a["offering"], student=student
        )
        Submission.objects.create(
            institute=a["institute"],
            assignment=assignment,
            student=student,
            marks=10,
            released=False,
        )
    with CaptureQueriesContext(connection) as expanded:
        rows = gradebook(scope)
    assert len(rows) == 13
    assert len(expanded) <= len(initial) + 1
    assert all(
        row["score"] is None for row in rows if row["student"] != str(a["student"].pk)
    )


@pytest.mark.django_db
def test_trends_exclude_other_students_departments_and_tenants(world, client_for):
    a, b = world["a"], world["b"]
    for data in [a, b]:
        Activity.objects.create(
            institute=data["institute"],
            offering=data["offering"],
            user=data["student"],
            kind="lesson_complete",
        )
    Activity.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        user=a["teacher"],
        kind="lesson_create",
    )
    unit = Unit.objects.create(institute=a["institute"], name="Private department")
    course = Course.objects.create(
        institute=a["institute"], unit=unit, code="PRV", name="Private"
    )
    offering = Offering.objects.create(
        institute=a["institute"], course=course, term=a["term"], title="Private"
    )
    Activity.objects.create(
        institute=a["institute"], offering=offering, user=a["admin"], kind="private"
    )
    for role, expected in [("student", 1), ("teacher", 2), ("head", 2), ("admin", 3)]:
        response = client_for(a, role).get("/api/v1/analytics/trends/")
        assert response.status_code == 200
        assert sum(row["count"] for row in response.data["activity"]) == expected
        if role == "student":
            assert response.data["instructor_workload"] == []
            assert response.data["departments"] == []
        if role == "teacher":
            assert response.data["instructor_workload"] == [
                {"teacher": "ateacher", "courses": 1, "learners": 1}
            ]


@pytest.mark.django_db
def test_department_counts_are_distinct_and_unassigned_label_does_not_merge(world, client_for):
    a = world["a"]
    named = Unit.objects.create(institute=a["institute"], name="Unassigned")
    for index, unit in enumerate([named, None, named]):
        course = Course.objects.create(institute=a["institute"], unit=unit, code=f"S{index}", name=f"Subject {index}")
        offering = Offering.objects.create(institute=a["institute"], course=course, term=a["term"], title=f"Offering {index}")
        Enrollment.objects.create(institute=a["institute"], offering=offering, student=a["student"])
    response = client_for(a, "admin").get("/api/v1/analytics/trends/")
    assert response.status_code == 200
    departments = {row["unit_id"]: row for row in response.data["departments"]}
    assert len(departments) == 3
    assert departments[str(named.pk)]["courses"] == 2
    assert departments[str(named.pk)]["learners"] == 1
    assert departments[None]["courses"] == 1
    assert departments[None]["learners"] == 1
    assert departments[None]["unit"] == departments[str(named.pk)]["unit"] == "Unassigned"
    head = client_for(a, "head").get("/api/v1/analytics/trends/").data
    assert [row["unit_id"] for row in head["departments"]] == [str(a["unit"].pk)]


@pytest.mark.django_db
def test_risk_summary_uses_latest_authorized_prediction(world, client_for):
    a, b = world["a"], world["b"]
    for index, (data, category) in enumerate(
        [(a, "low"), (a, "high"), (b, "moderate")]
    ):
        prediction = Prediction.objects.create(
            institute=data["institute"],
            offering=data["offering"],
            student=data["student"],
            probability=0.8,
            category=category,
            version="demo",
            features={},
            warning="DEMO",
        )
        Prediction.objects.filter(pk=prediction.pk).update(
            created_at=timezone.now() + timedelta(seconds=index)
        )
    response = client_for(a, "teacher").get("/api/v1/predictions/summary/")
    assert response.status_code == 200
    assert response.data["distribution"] == {"low": 0, "moderate": 0, "high": 1}
    assert response.data["learner_course_pairs"] == 1
    assert (
        client_for(a, "student").get("/api/v1/predictions/summary/").status_code == 403
    )

@pytest.mark.django_db
def test_course_trends_and_prediction_summaries_never_mix_offerings(world, client_for):
    a = world['a']
    other = Offering.objects.create(institute=a['institute'], course=a['course'], term=a['term'], title='Another class')
    other.teachers.add(a['teacher'])
    Enrollment.objects.create(institute=a['institute'], offering=other, student=a['student'])
    for offering, count, category in [(a['offering'], 1, 'low'), (other, 3, 'high')]:
        Activity.objects.bulk_create([Activity(institute=a['institute'], offering=offering, user=a['student'], kind='lesson_complete') for _ in range(count)])
        Prediction.objects.create(institute=a['institute'], offering=offering, student=a['student'], probability=.1, category=category, version='synthetic-demo', features={}, warning='Experimental')
    admin = client_for(a, 'admin')
    selected = f'?offering={a["offering"].pk}'
    data = admin.get('/api/v1/analytics/trends/' + selected).data
    assert sum(day['count'] for day in data['activity']) == 1
    assert data['departments'][0]['learners'] == 1 and data['departments'][0]['courses'] == 1
    assert data['instructor_workload'][0]['courses'] == 1
    data = admin.get('/api/v1/predictions/summary/' + selected).data
    assert data['learner_course_pairs'] == 1 and data['distribution'] == {'low': 1, 'moderate': 0, 'high': 0}
    foreign = f'?offering={world["b"]["offering"].pk}'
    assert admin.get('/api/v1/analytics/trends/' + foreign).data['activity'] == []
    assert admin.get('/api/v1/predictions/summary/' + foreign).data['learner_course_pairs'] == 0
    assert admin.get('/api/v1/analytics/trends/?offering=invalid').status_code == 400
    assert client_for(a, 'student').get('/api/v1/predictions/summary/' + selected).status_code == 403
