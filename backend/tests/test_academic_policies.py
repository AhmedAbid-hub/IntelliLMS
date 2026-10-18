from datetime import timedelta
import pytest
from django.utils import timezone
from apps.insights.models import Audit
from apps.learning.models import ManualGrade, Attendance, AttendanceSession, Quiz, Question, Attempt

pytestmark = pytest.mark.django_db


def test_policy_changes_validate_permissions_reason_and_preserve_audited_values(world, client_for):
    a = world["a"]
    url = f'/api/v1/institutes/{a["institute"].pk}/'
    admin = client_for(a, "admin")
    rules = {"lock_released_grades": True, "attendance_edit_window_days": 7}
    for role in ("head", "teacher", "student"):
        assert client_for(a, role).patch(url, {"grading_rules": rules, "policy_change_reason": "Authorized policy"}, format="json").status_code == 403
    assert client_for(world["b"], "admin").patch(url, {"grading_rules": rules}, format="json").status_code == 404
    assert admin.patch(url, {"grading_rules": rules}, format="json").status_code == 400
    for invalid in ({"lock_released_grades": "true"}, {"attendance_edit_window_days": -1}, {"attendance_edit_window_days": True}, {"attendance_edit_window_days": 1.5}, {"attendance_edit_window_days": 366}):
        assert admin.patch(url, {"grading_rules": invalid, "policy_change_reason": "Policy review"}, format="json").status_code == 400
    result = admin.patch(url, {"grading_rules": rules, "policy_change_reason": "Approved institutional protection rules"}, format="json")
    assert result.status_code == 200, result.data
    event = Audit.objects.get(action="Institute.update")
    assert event.detail["previous_rules"] == {}
    assert event.detail["current_rules"] == rules
    assert event.detail["reason"] == "Approved institutional protection rules"


def test_released_marks_and_quiz_results_require_independent_corrections_when_protected(world, client_for):
    a = world["a"]
    a["institute"].grading_rules = {"lock_released_grades": True}
    a["institute"].save()
    grade = ManualGrade.objects.create(institute=a["institute"], offering=a["offering"], student=a["student"], title="Released exam", marks=40, max_marks=100, released=True)
    teacher = client_for(a, "teacher")
    url = f"/api/v1/manual-grades/{grade.pk}/"
    assert teacher.patch(url, {"marks": 90}, format="json").status_code == 400
    assert teacher.patch(url, {"released": False}, format="json").status_code == 400
    control = teacher.get(f"/api/v1/academic-control/?kind=manual&target={grade.pk}")
    assert control.data["finalized"] is False
    assert "released grades" in control.data["lock_reason"]
    request = teacher.post("/api/v1/corrections/", {"kind": "manual", "target": str(grade.pk), "proposed": {"marks": "45.50"}, "reason": "Verified original marking rubric"}, format="json")
    assert request.status_code == 201
    grade.refresh_from_db()
    assert grade.marks == 40
    a["offering"].head_correction_review = True
    a["offering"].save()
    approved = client_for(a, "head").post(f'/api/v1/corrections/{request.data["id"]}/decide/', {"decision": "approved", "reason": "Independent department review"}, format="json")
    assert approved.status_code == 200
    grade.refresh_from_db()
    assert float(grade.marks) == 45.5 and grade.released
    now = timezone.now()
    quiz = Quiz.objects.create(institute=a["institute"], offering=a["offering"], title="Released quiz", released=True, opens_at=now, closes_at=now + timedelta(hours=1))
    assert teacher.patch(f"/api/v1/quizzes/{quiz.pk}/", {"released": False}, format="json").status_code == 400


def test_attendance_window_boundary_and_audited_emergency_keep_history(world, client_for):
    a = world["a"]
    a["institute"].grading_rules = {"attendance_edit_window_days": 7}
    a["institute"].save()
    teacher = client_for(a, "teacher")
    sessions = [AttendanceSession.objects.create(institute=a["institute"], offering=a["offering"], date=timezone.localdate() - timedelta(days=days)) for days in (7, 8)]
    old = Attendance.objects.create(institute=a["institute"], session=sessions[1], student=a["student"], status="absent")
    payload = {"records": [{"student": str(a["student"].pk), "status": "present"}]}
    assert teacher.post(f"/api/v1/attendance-sessions/{sessions[0].pk}/mark/", payload, format="json").status_code == 200
    assert teacher.post(f"/api/v1/attendance-sessions/{sessions[1].pk}/mark/", payload, format="json").status_code == 400
    assert teacher.patch(f"/api/v1/attendance-sessions/{sessions[1].pk}/", {"date": timezone.localdate().isoformat()}, format="json").status_code == 400
    old.refresh_from_db()
    assert old.status == "absent"
    approved = client_for(a, "admin").post("/api/v1/corrections/emergency/", {"kind": "attendance", "target": str(old.pk), "proposed": {"status": "present"}, "reason": "Emergency correction verified against signed register"}, format="json")
    assert approved.status_code == 201, approved.data
    old.refresh_from_db()
    assert old.status == "present"
    assert Audit.objects.filter(action="Academic.emergency_override", object_id=str(old.pk)).exists()
