import pytest
from apps.accounts.models import Membership
from datetime import date
from django.utils import timezone
from apps.learning.models import ManualGrade, AttendanceSession, Attendance, CorrectionRequest, Assignment, Submission, Quiz, Question, Attempt
from apps.insights.models import Audit

pytestmark=pytest.mark.django_db


def test_finalized_grade_correction_review_permissions_and_override(world,client_for):
    a=world["a"];admin=client_for(a,"admin");teacher=client_for(a,"teacher");head=client_for(a,"head")
    grade=ManualGrade.objects.create(institute=a["institute"],offering=a["offering"],student=a["student"],title="Exam",marks=40,max_marks=100,released=True)
    target={"kind":"manual","target":str(grade.pk)}
    assert teacher.post("/api/v1/academic-control/finalize/",{**target,"finalized":True,"reason":"Final exam approval"},format="json").status_code==403
    assert admin.post("/api/v1/academic-control/finalize/",{**target,"finalized":True,"reason":"Final exam approval"},format="json").status_code==200
    assert teacher.patch(f"/api/v1/manual-grades/{grade.pk}/",{"marks":55,"finalized":False},format="json").status_code==400
    request={**target,"proposed":{"marks":"55.00"},"reason":"Calculation error in final total"}
    assert client_for(world["b"],"admin").post("/api/v1/corrections/",request,format="json").status_code==404
    assert client_for(a,"student").post("/api/v1/corrections/",request,format="json").status_code==403
    proposed=teacher.post("/api/v1/corrections/",request,format="json");assert proposed.status_code==201,proposed.data
    assert teacher.post("/api/v1/corrections/",request,format="json").status_code==400
    decision=f'/api/v1/corrections/{proposed.data["id"]}/decide/'
    data={"decision":"approved","reason":"Verified calculation against marking sheet"}
    assert teacher.post(decision,data,format="json").status_code==403
    # The current architecture request requires explicit course delegation.
    assert not a["offering"].head_correction_review
    assert head.post(decision,data,format="json").status_code==403
    a["offering"].head_correction_review=True;a["offering"].save()
    assert client_for(world["b"],"head").post(decision,data,format="json").status_code==404
    assert head.post(decision,data,format="json").status_code==200
    grade.refresh_from_db();assert grade.marks==55 and grade.finalized
    assert admin.post(decision,data,format="json").status_code==400
    assert Audit.objects.filter(object_id=str(grade.pk),action="ManualGrade.history").exists()
    override={**target,"proposed":{"marks":"60.00"},"reason":"Emergency correction authorized by exam board"}
    assert teacher.post("/api/v1/corrections/emergency/",override,format="json").status_code==403
    assert admin.post("/api/v1/corrections/emergency/",override,format="json").status_code==201
    grade.refresh_from_db();assert grade.marks==60 and grade.finalized
    assert Audit.objects.filter(action="Academic.emergency_override",object_id=str(grade.pk)).exists()


def test_attendance_finalization_delegation_rejection_and_stale_proposals(world,client_for):
    a=world["a"];admin=client_for(a,"admin");teacher=client_for(a,"teacher");head=client_for(a,"head")
    session=AttendanceSession.objects.create(institute=a["institute"],offering=a["offering"],date=date.today(),finalized=True)
    row=Attendance.objects.create(institute=a["institute"],session=session,student=a["student"],status="absent")
    assert teacher.post(f"/api/v1/attendance-sessions/{session.pk}/mark/",{"records":[{"student":str(a["student"].pk),"status":"present"}]},format="json").status_code==400
    assert admin.patch(f"/api/v1/attendance-sessions/{session.pk}/",{"title":"Different"},format="json").status_code==400
    data={"kind":"attendance","target":str(row.pk),"proposed":{"status":"present"},"reason":"Verified signed attendance register"}
    proposed=teacher.post("/api/v1/corrections/",data,format="json");assert proposed.status_code==201
    a["offering"].head_correction_review=True;a["offering"].save()
    url=f'/api/v1/corrections/{proposed.data["id"]}/decide/'
    Attendance.objects.filter(pk=row.pk).update(status="late")
    assert head.post(url,{"decision":"approved","reason":"Department register verified"},format="json").status_code==400
    assert head.post(url,{"decision":"rejected","reason":"New attendance evidence requires a fresh request"},format="json").status_code==200
    assert head.post("/api/v1/corrections/",data,format="json").status_code==403
    Membership.objects.filter(user=a["head"], institute=a["institute"]).update(can_teach=True)
    a["offering"].teachers.add(a["head"])
    proposed=head.post("/api/v1/corrections/",data,format="json");assert proposed.status_code==201
    url=f'/api/v1/corrections/{proposed.data["id"]}/decide/'
    assert head.post(url,{"decision":"approved","reason":"My own request cannot be approved"},format="json").status_code==403
    assert admin.post(url,{"decision":"approved","reason":"Verified the department evidence"},format="json").status_code==200
    row.refresh_from_db();assert row.status=="present"


def test_submission_and_attempt_proposals_validate_marks_and_lock_normal_grading(world,client_for):
    from datetime import timedelta
    a=world["a"];teacher=client_for(a,"teacher");admin=client_for(a,"admin")
    assignment=Assignment.objects.create(institute=a["institute"],offering=a["offering"],title="Essay",due_at=timezone.now()+timedelta(days=1),max_marks=20)
    submission=Submission.objects.create(institute=a["institute"],assignment=assignment,student=a["student"],marks=10,finalized=True)
    assert teacher.post(f"/api/v1/submissions/{submission.pk}/grade/",{"marks":12},format="json").status_code==400
    values={"kind":"submission","target":str(submission.pk),"reason":"Rechecked essay rubric","proposed":{"marks":21}}
    assert teacher.post("/api/v1/corrections/",values,format="json").status_code==400
    values["proposed"]={"marks":12,"feedback":"Rechecked","released":True}
    assert admin.post("/api/v1/corrections/emergency/",values,format="json").status_code==201
    quiz=Quiz.objects.create(institute=a["institute"],offering=a["offering"],title="Quiz",opens_at=timezone.now(),closes_at=timezone.now()+timedelta(hours=1))
    question=Question.objects.create(institute=a["institute"],quiz=quiz,prompt="Explain",kind="short",marks=10)
    attempt=Attempt.objects.create(institute=a["institute"],quiz=quiz,student=a["student"],deadline=quiz.closes_at,submitted_at=timezone.now(),marks=5,manual_marks={str(question.pk):5},finalized=True)
    assert teacher.post(f"/api/v1/attempts/{attempt.pk}/grade/",{"manual_marks":{str(question.pk):8}},format="json").status_code==400
    result=admin.post("/api/v1/corrections/emergency/",{"kind":"attempt","target":str(attempt.pk),"reason":"Verified short-answer rubric","proposed":{"manual_marks":{str(question.pk):8}}},format="json")
    assert result.status_code==201,result.data
    attempt.refresh_from_db();assert attempt.marks==8 and attempt.finalized
