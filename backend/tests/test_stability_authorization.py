"""Regressions for academic writes that must not inherit oversight permissions."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import Membership, User
from apps.learning.models import ManualGrade, Quiz
from apps.insights.models import Audit

pytestmark = pytest.mark.django_db


def grade_payload(a):
    return {
        "offering": str(a["offering"].pk),
        "student": str(a["student"].pk),
        "title": "Recorded assessment",
        "marks": "50.00",
        "max_marks": 100,
        "released": True,
    }


@pytest.mark.parametrize("resource", ["manual-grades", "attendance-sessions"])
def test_finalization_cannot_be_set_through_ordinary_create_or_update(
    world, client_for, resource
):
    a = world["a"]
    teacher = client_for(a, "teacher")
    payload = grade_payload(a) if resource == "manual-grades" else {
        "offering": str(a["offering"].pk),
        "date": timezone.localdate().isoformat(),
        "title": "Class attendance",
    }
    response = teacher.post(
        f"/api/v1/{resource}/", {**payload, "finalized": True}, format="json"
    )
    assert response.status_code == 201, response.data
    assert response.data["finalized"] is False
    url = f'/api/v1/{resource}/{response.data["id"]}/'
    changed = teacher.patch(url, {"finalized": True}, format="json")
    assert changed.status_code == 200, changed.data
    assert changed.data["finalized"] is False
    assert not Audit.objects.filter(action="Academic.finalization").exists()


@pytest.mark.parametrize("role", ["admin", "head"])
def test_oversight_roles_cannot_create_or_change_manual_marks(world, client_for, role):
    a = world["a"]
    client = client_for(a, role)
    response = client.post("/api/v1/manual-grades/", grade_payload(a), format="json")
    assert response.status_code == 403, response.data
    assert not ManualGrade.objects.exists()
    teacher = client_for(a, "teacher")
    created = teacher.post("/api/v1/manual-grades/", grade_payload(a), format="json")
    assert created.status_code == 201, created.data
    url = f'/api/v1/manual-grades/{created.data["id"]}/'
    assert client.get(url).status_code == 200  # Oversight remains available.
    assert client.patch(url, {"marks": "99.00"}, format="json").status_code == 403
    assert ManualGrade.objects.get(pk=created.data["id"]).marks == 50


@pytest.mark.parametrize("role", ["admin", "head"])
def test_only_assigned_instructors_can_release_quiz_grades(world, client_for, role):
    a = world["a"]
    quiz = Quiz.objects.create(
        institute=a["institute"], offering=a["offering"], title="Results",
        opens_at=timezone.now(), closes_at=timezone.now() + timedelta(hours=1),
    )
    url = f"/api/v1/quizzes/{quiz.pk}/"
    client = client_for(a, role)
    assert client.get(url).status_code == 200
    response = client.patch(url, {"released": True}, format="json")
    assert response.status_code == 403, response.data
    quiz.refresh_from_db()
    assert not quiz.released
    assert client_for(a, "teacher").patch(url, {"released": True}, format="json").status_code == 200


def test_teaching_head_needs_both_capability_and_assignment(world, client_for):
    a = world["a"]
    head = client_for(a, "head")
    membership = Membership.objects.get(user=a["head"], institute=a["institute"])
    membership.can_teach = True
    membership.save(update_fields=["can_teach"])
    assert head.post("/api/v1/manual-grades/", grade_payload(a), format="json").status_code == 403
    a["offering"].teachers.add(a["head"])
    response = head.post("/api/v1/manual-grades/", grade_payload(a), format="json")
    assert response.status_code == 201, response.data
    membership.can_teach = False
    membership.save(update_fields=["can_teach"])
    # A stale course assignment must not retain a revoked teaching capability.
    url = f'/api/v1/manual-grades/{response.data["id"]}/'
    assert head.patch(url, {"marks": "99.00"}, format="json").status_code == 403


@pytest.mark.parametrize("role", ["admin", "head"])
def test_initial_quiz_release_needs_teaching_authorization(world, client_for, role):
    a = world["a"]
    now = timezone.now()
    payload = {
        "offering": str(a["offering"].pk), "title": "Initially released",
        "opens_at": now.isoformat(), "closes_at": (now + timedelta(hours=1)).isoformat(),
        "released": True,
    }
    result = client_for(a, role).post("/api/v1/quizzes/", payload, format="json")
    assert result.status_code == 403, result.data
    assert not Quiz.objects.exists()
    assert client_for(a, "teacher").post("/api/v1/quizzes/", payload, format="json").status_code == 201


def test_platform_provisioning_rejects_malformed_institute_without_server_errors(world, client_for):
    a = world["a"]
    root = User.objects.create_superuser(username="stability-root", email="stability-root@example.test", password="Secure-admin-pass42!")
    client = client_for({**a, "root": root}, "root")
    before = Membership.objects.count()
    for bad in ["not-a-uuid", [str(a["institute"].pk)], {"id": str(a["institute"].pk)}, True]:
        for url, values in [
            ("/api/v1/memberships/", {"username": "new-admin", "email": "new-admin@example.test"}),
            ("/api/v1/memberships/attach/", {"user": str(world["b"]["admin"].pk)}),
        ]:
            response = client.post(url, {**values, "role": "admin", "institute": bad}, format="json")
            assert response.status_code == 400, response.data
    assert Membership.objects.count() == before


def test_head_review_does_not_cross_departments_even_with_teaching_assignment(world, client_for):
    from apps.academics.models import Unit, Course, Offering, Enrollment
    from apps.learning.models import CorrectionRequest
    a = world["a"]
    unit = Unit.objects.create(institute=a["institute"], name="Another department")
    course = Course.objects.create(institute=a["institute"], unit=unit, code="OTHER", name="Other subject")
    offering = Offering.objects.create(institute=a["institute"], course=course, term=a["term"], title="Other class")
    offering.teachers.add(a["teacher"], a["head"])
    Membership.objects.filter(user=a["head"]).update(can_teach=True)
    Enrollment.objects.create(institute=a["institute"], offering=offering, student=a["student"])
    grade = ManualGrade.objects.create(institute=a["institute"], offering=offering, student=a["student"], title="Exam", marks=40, max_marks=100, finalized=True)
    proposed = client_for(a, "teacher").post("/api/v1/corrections/", {
        "kind": "manual", "target": str(grade.pk), "proposed": {"marks": "55.00"},
        "reason": "Rechecked the original scoring sheet",
    }, format="json")
    assert proposed.status_code == 201, proposed.data
    head = client_for(a, "head")
    request_id = proposed.data["id"]
    assert head.get(f"/api/v1/academic-control/?kind=manual&target={grade.pk}").status_code == 404
    assert head.get(f"/api/v1/corrections/{request_id}/").status_code == 404
    assert head.post(f"/api/v1/corrections/{request_id}/decide/", {
        "decision": "approved", "reason": "Outside department should remain denied",
    }, format="json").status_code == 404
    assert CorrectionRequest.objects.get(pk=request_id).status == "pending"
    grade.refresh_from_db()
    assert grade.marks == 40 and grade.finalized
