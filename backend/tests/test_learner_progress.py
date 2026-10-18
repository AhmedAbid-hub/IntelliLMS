from datetime import timedelta
import pytest
from django.utils import timezone
from apps.accounts.models import User, Membership
from apps.academics.models import Enrollment
from apps.learning.models import Assignment, Submission

pytestmark = pytest.mark.django_db


def test_learner_drilldown_is_scoped_released_only_and_missing_work_is_paginated(world, client_for):
    a, b = world["a"], world["b"]
    assignments = [Assignment.objects.create(institute=a["institute"], offering=a["offering"], title=f"Work {i}", due_at=timezone.now() - timedelta(days=1), published=True) for i in range(4)]
    Submission.objects.create(institute=a["institute"], assignment=assignments[0], student=a["student"], marks=10, released=False, feedback="Private draft feedback")
    Submission.objects.create(institute=a["institute"], assignment=assignments[1], student=a["student"], marks=70, released=True, feedback="Released feedback")
    Assignment.objects.create(institute=a["institute"], offering=a["offering"], title="Private draft", due_at=timezone.now(), published=False)
    params = {"offering": str(a["offering"].pk), "student": str(a["student"].pk)}
    endpoint = "/api/v1/analytics/learner-progress/"
    for role in ("student", "teacher", "head", "admin"):
        response = client_for(a, role).get(endpoint, params)
        assert response.status_code == 200, response.data
        assert response.data["count"] == 4
        rows = {row["title"]: row for row in response.data["results"]}
        assert rows["Work 0"]["marks"] is None and rows["Work 0"]["feedback"] == ""
        assert rows["Work 1"]["marks"] == "70.00" and rows["Work 1"]["feedback"] == "Released feedback"
        assert response.data["summary"]["score"] == 70
        missing = client_for(a, role).get(endpoint, {**params, "missing_only": "true", "page_size": 1})
        assert missing.data["count"] == 2 and len(missing.data["results"]) == 1 and missing.data["next"]
    student = client_for(a, "student")
    peer = User.objects.create_user(username="peer")
    Membership.objects.create(institute=a["institute"], user=peer, role="student")
    Enrollment.objects.create(institute=a["institute"], offering=a["offering"], student=peer)
    assert student.get(endpoint, {**params, "student": str(peer.pk)}).status_code == 404
    assert student.get(endpoint, {**params, "student": str(a["teacher"].pk)}).status_code == 404
    for role in ("student", "teacher", "head", "admin"):
        assert client_for(b, role).get(endpoint, params).status_code == 404
    assert student.get(endpoint, {**params, "page_size": 101}).status_code == 400
    assert student.get(endpoint, {"offering": "invalid"}).status_code == 400


def test_enrollment_selector_can_find_learners_beyond_first_page_without_scope_leaks(world, client_for):
    a = world["a"]
    learners = User.objects.bulk_create([User(username=f"searchable-{i:03}", email=f"searchable-{i}@example.test") for i in range(60)])
    Enrollment.objects.bulk_create([Enrollment(institute=a["institute"], offering=a["offering"], student=learner) for learner in learners])
    endpoint = "/api/v1/enrollments/"
    teacher = client_for(a, "teacher")
    found = teacher.get(endpoint, {"offering": str(a["offering"].pk), "search": "searchable-059"})
    assert found.data["count"] == 1 and str(found.data["results"][0]["student"]) == str(learners[-1].pk)
    assert client_for(world["b"], "teacher").get(endpoint, {"search": "searchable-059"}).data["count"] == 0
    assert client_for(a, "student").get(endpoint, {"search": "searchable-059"}).data["count"] == 0
    ordered = teacher.get(endpoint, {"search": "searchable-", "ordering": "student__username"})
    assert ordered.data["count"] == 60 and ordered.data["next"]
    assert str(ordered.data["results"][0]["student"]) == str(learners[0].pk)
