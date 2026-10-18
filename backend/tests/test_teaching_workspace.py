from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import Membership, TeacherAppointment
from apps.academics.models import Unit, Course, Offering, Enrollment
from apps.learning.models import Quiz, AttendanceSession, Lesson, ManualGrade

pytestmark = pytest.mark.django_db


def switch(client, workspace="teaching"):
    return client.post("/api/v1/auth/select-workspace/", {"academic_workspace": workspace}, format="json")


def test_head_workspace_requires_capability_and_filters_personal_assignments(world, client_for):
    a = world["a"]
    head = client_for(a, "head")
    assert switch(head).status_code == 403
    member = Membership.objects.get(user=a["head"])
    member.can_teach = True
    member.save()
    assert switch(head).status_code == 200
    assert head.get("/api/v1/offerings/").data["count"] == 0
    assert head.get(f'/api/v1/offerings/{a["offering"].pk}/').status_code == 404
    a["offering"].teachers.add(a["head"])
    assert head.get("/api/v1/offerings/").data["count"] == 1
    assert head.post("/api/v1/offerings/", {}, format="json").status_code == 403
    assert head.get("/api/v1/teacher-appointments/").status_code == 403
    assert switch(head, "department").status_code == 200
    assert head.get("/api/v1/teacher-appointments/").status_code == 200
    assert Membership.objects.get(pk=member.pk).role == "head"


def test_head_teaches_across_departments_without_gaining_review_or_other_class_access(world, client_for):
    a = world["a"]
    member = Membership.objects.get(user=a["head"])
    member.can_teach = True
    member.save()
    other = Unit.objects.create(institute=a["institute"], name="Languages")
    course = Course.objects.create(institute=a["institute"], unit=other, code="LAN", name="Language")
    assigned = Offering.objects.create(institute=a["institute"], course=course, term=a["term"], title="Assigned language")
    unrelated = Offering.objects.create(institute=a["institute"], course=course, term=a["term"], title="Another language class")
    appointment = TeacherAppointment.objects.create(institute=a["institute"], membership=member, unit=other, reason="Authorized additional department")
    assigned.teachers.add(a["head"])
    a["offering"].teachers.add(a["head"])
    Enrollment.objects.create(institute=a["institute"], offering=assigned, student=a["student"])
    head = client_for(a, "head")
    assert head.get(f"/api/v1/offerings/{assigned.pk}/").status_code == 404
    assert switch(head).status_code == 200
    assert head.get("/api/v1/offerings/").data["count"] == 2
    assert head.get(f"/api/v1/offerings/{unrelated.pk}/").status_code == 404
    assert head.get(f'/api/v1/offerings/{world["b"]["offering"].pk}/').status_code == 404
    grade = head.post("/api/v1/manual-grades/", {
        "offering": str(assigned.pk), "student": str(a["student"].pk),
        "title": "Language exam", "marks": "45.50", "max_marks": 100,
    }, format="json")
    assert grade.status_code == 201, grade.data
    assert head.post("/api/v1/academic-control/finalize/", {
        "kind": "manual", "target": grade.data["id"], "finalized": True,
        "reason": "Teaching must not grant departmental review",
    }, format="json").status_code == 403
    # Simulate a stale assignment after an external appointment revocation.
    appointment.active = False
    appointment.save()
    assert head.get(f"/api/v1/offerings/{assigned.pk}/").status_code == 404
    assert head.patch(f'/api/v1/manual-grades/{grade.data["id"]}/', {"marks": 99}, format="json").status_code == 404
    assert switch(head, "department").status_code == 200
    assert head.get(f"/api/v1/offerings/{assigned.pk}/").status_code == 404


def test_revoked_teaching_capability_fails_closed_and_can_return_to_management(world, client_for):
    a = world["a"]
    Membership.objects.filter(user=a["head"]).update(can_teach=True)
    a["offering"].teachers.add(a["head"])
    head = client_for(a, "head")
    assert switch(head).status_code == 200
    Membership.objects.filter(user=a["head"]).update(can_teach=False)
    assert head.get("/api/v1/offerings/").status_code == 403
    assert switch(head).status_code == 403
    assert switch(head, "department").status_code == 200
    assert head.get("/api/v1/offerings/").status_code == 200
    for role in ("admin", "teacher", "student"):
        assert switch(client_for(a, role)).status_code == 403


def test_oversight_cannot_author_content_questions_or_attendance(world, client_for):
    a = world["a"]
    now = timezone.now()
    quiz = Quiz.objects.create(institute=a["institute"], offering=a["offering"], title="Draft", opens_at=now, closes_at=now + timedelta(hours=1))
    lesson = Lesson.objects.create(institute=a["institute"], offering=a["offering"], title="Draft lesson")
    session = AttendanceSession.objects.create(institute=a["institute"], offering=a["offering"], date=now.date())
    for role in ("admin", "head"):
        client = client_for(a, role)
        assert client.get(f"/api/v1/lessons/{lesson.pk}/").status_code == 200
        assert client.patch(f"/api/v1/lessons/{lesson.pk}/", {"title": "Forged"}, format="json").status_code == 403
        assert client.post("/api/v1/lessons/", {"offering": str(a["offering"].pk), "title": "Forged"}, format="json").status_code == 403
        assert client.post(f"/api/v1/quizzes/{quiz.pk}/bulk-questions/", {"questions": [{"prompt": "Q", "kind": "short", "marks": 1}]}, format="json").status_code == 403
        assert client.post(f"/api/v1/attendance-sessions/{session.pk}/mark/", {"records": [{"student": str(a["student"].pk), "status": "present"}]}, format="json").status_code == 403
    teacher = client_for(a, "teacher")
    assert teacher.patch(f"/api/v1/lessons/{lesson.pk}/", {"title": "Authorized"}, format="json").status_code == 200
    assert teacher.post(f"/api/v1/attendance-sessions/{session.pk}/mark/", {"records": [{"student": str(a["student"].pk), "status": "present"}]}, format="json").status_code == 200


def test_workspace_switch_requires_csrf_and_resets_on_institute_selection(world, client_for):
    from rest_framework.test import APIClient
    a = world["a"]
    Membership.objects.filter(user=a["head"]).update(can_teach=True)
    head = client_for(a, "head")
    assert switch(head).data["academic_workspace"] == "teaching"
    response = head.post("/api/v1/auth/select-institute/", {"institute_id": str(a["institute"].pk)}, format="json")
    assert response.data["academic_workspace"] == "department"
    assert response.data["memberships"][0]["can_teach"] is True
    secure = APIClient(enforce_csrf_checks=True)
    secure.force_login(a["head"])
    assert switch(secure).status_code == 403
