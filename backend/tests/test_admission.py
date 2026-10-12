import uuid
import pytest
from django.core import mail
from django.test import override_settings
from apps.accounts.models import Membership, User
from apps.academics.models import Program, AdmissionBatch, Section, CurriculumItem, Enrollment, StudentPlacement

pytestmark=pytest.mark.django_db


def setup(a):
    program=Program.objects.create(institute=a["institute"],unit=a["unit"],name="Admissions")
    batch=AdmissionBatch.objects.create(institute=a["institute"],program=program,year=a["year"],name="2026")
    section=Section.objects.create(institute=a["institute"],program=program,batch=batch,name="A")
    CurriculumItem.objects.create(institute=a["institute"],program=program,course=a["course"],stage=1)
    a["offering"].section=section;a["offering"].save()
    return program,batch,section


def body(a,program,batch,section):
    return dict(key=str(uuid.uuid4()),username="new-admission",email="new-admission@example.test",first_name="Amina",last_name="Ali",student_identifier="R001",program=str(program.pk),batch=str(batch.pk),year=str(a["year"].pk),section=str(section.pk),offerings=[str(a["offering"].pk)])

@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_admission_preview_atomic_creation_retry_and_scope(world,client_for,django_capture_on_commit_callbacks):
    a=world["a"];p,b,s=setup(a);data=body(a,p,b,s);admin=client_for(a,"admin")
    count=User.objects.count()
    preview=admin.post("/api/v1/admissions/",data,format="json")
    assert preview.status_code==200,preview.data
    assert preview.data["preview"] and User.objects.count()==count and len(mail.outbox)==0
    for role in ["head","teacher","student"]:
        assert client_for(a,role).post("/api/v1/admissions/",data,format="json").status_code==403
    assert client_for(world["b"],"admin").post("/api/v1/admissions/",data,format="json").status_code==400
    invalid={**data,"preview":False,"offerings":[str(world["b"]["offering"].pk)]}
    assert admin.post("/api/v1/admissions/",invalid,format="json").status_code==400
    assert User.objects.count()==count
    with django_capture_on_commit_callbacks(execute=True):
        created=admin.post("/api/v1/admissions/",{**data,"preview":False},format="json")
    assert created.status_code==201,created.data
    member=Membership.objects.get(pk=created.data["membership"])
    assert member.role=="student" and member.section==s
    assert not member.user.has_usable_password()
    assert Enrollment.objects.filter(student=member.user,offering=a["offering"],active=True).count()==1
    assert len(mail.outbox)==1
    replay=admin.post("/api/v1/admissions/",{**data,"preview":False},format="json")
    assert replay.status_code==200 and replay.data["replayed"] and replay.data["membership"]==str(member.pk)
    assert User.objects.count()==count+1 and len(mail.outbox)==1
    assert admin.post("/api/v1/admissions/",{**data,"preview":False,"last_name":"Changed"},format="json").status_code==400
    assert admin.post("/api/v1/admissions/",{**data,"key":str(uuid.uuid4())},format="json").status_code==400
    query=f"program={p.pk}&batch={b.pk}&section={s.pk}&year={a['year'].pk}"
    suggestions=admin.get("/api/v1/admissions/offerings/?"+query)
    assert suggestions.status_code==200 and suggestions.data["count"]==1
    assert suggestions.data["results"][0]["required_subject"] is True
    assert client_for(a,"student").get("/api/v1/admissions/offerings/?"+query).status_code==403


def test_transfer_preserves_placement_and_enrollment_history(world,client_for):
    a=world["a"];p,b,s=setup(a);admin=client_for(a,"admin")
    member=Membership.objects.get(user=a["student"]);member.section=s;member.save()
    other=Section.objects.create(institute=a["institute"],program=p,batch=b,name="B")
    data={"program":str(p.pk),"batch":str(b.pk),"year":str(a["year"].pk),"section":str(other.pk),"offerings":[],"withdraw":[str(a["offering"].pk)],"reason":"Student moved to section B"}
    url=f"/api/v1/memberships/{member.pk}/transfer/"
    assert client_for(a,"head").post(url,data,format="json").status_code==403
    assert client_for(world["b"],"admin").post(url,data,format="json").status_code==404
    invalid={**data,"offerings":[str(a["offering"].pk)]}
    assert admin.post(url,invalid,format="json").status_code==400
    assert Enrollment.objects.get(student=a["student"],offering=a["offering"]).active
    assert admin.post(url,data,format="json").status_code==200
    member.refresh_from_db();assert member.section==other
    assert member.placements.count()==2 and member.placements.filter(ended_at__isnull=True).count()==1
    assert member.placements.get(section=s).ended_at is not None
    assert not Enrollment.objects.get(student=a["student"],offering=a["offering"]).active
    assert admin.patch(f"/api/v1/memberships/{member.pk}/",{"section":str(s.pk)},format="json").status_code==400
    history=f"/api/v1/memberships/{member.pk}/placements/"
    assert client_for(a,"student").get(history).data["count"]==2
    assert client_for(world["b"],"student").get(history).status_code==404
    back={**data,"section":str(s.pk),"offerings":[str(a["offering"].pk)],"withdraw":[]}
    assert admin.post(url,back,format="json").status_code==200
    assert Enrollment.objects.filter(student=a["student"],offering=a["offering"]).count()==1
    assert Enrollment.objects.get(student=a["student"],offering=a["offering"]).active
    member.active=False;member.save()
    assert admin.get(history).data["count"]==3
    assert client_for(world["b"],"admin").get(history).status_code==404
    assert admin.post(url,data,format="json").status_code==404
