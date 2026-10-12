import pytest
from apps.academics.models import Program, Section, Course, AdmissionBatch, CurriculumItem
from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def test_curriculum_batches_validation_and_history(world, client_for):
    a, b = world["a"], world["b"]
    client = client_for(a, "admin")
    program = Program.objects.create(institute=a["institute"], unit=a["unit"], name="Computing", duration_terms=6)
    foreign = Program.objects.create(institute=b["institute"], unit=b["unit"], name="Other")
    body = {"program":str(program.pk),"course":str(a["course"].pk),"stage":1,"required":True}
    result = client.post("/api/v1/curriculum/", body, format="json")
    assert result.status_code == 201, result.data
    item = result.data["id"]
    assert client.post("/api/v1/curriculum/", body, format="json").status_code == 400
    assert client.post("/api/v1/curriculum/", {**body,"stage":7}, format="json").status_code == 400
    assert client.post("/api/v1/curriculum/", {**body,"program":str(foreign.pk)}, format="json").status_code == 400
    stage6 = client.post("/api/v1/curriculum/", {**body,"stage":6,"required":False}, format="json")
    assert stage6.status_code == 201
    assert client.patch(f"/api/v1/programs/{program.pk}/", {"duration_terms":5}, format="json").status_code == 400
    batch_body = {"name":"2026 intake","program":str(program.pk),"year":str(a["year"].pk)}
    batch = client.post("/api/v1/batches/", batch_body, format="json")
    assert batch.status_code == 201, batch.data
    assert client.post("/api/v1/batches/", batch_body, format="json").status_code == 400
    section = client.post("/api/v1/sections/", {"name":"A","program":str(program.pk),"batch":batch.data["id"]}, format="json")
    assert section.status_code == 201, section.data
    other = Program.objects.create(institute=a["institute"], name="Other")
    assert client.post("/api/v1/sections/", {"name":"B","program":str(other.pk),"batch":batch.data["id"]}, format="json").status_code == 400
    assert client.delete(f'/api/v1/batches/{batch.data["id"]}/').status_code == 400
    assert client.delete(f"/api/v1/courses/{a['course'].pk}/").status_code == 400
    assert client.patch(f"/api/v1/curriculum/{item}/", {"active":False}, format="json").status_code == 200
    assert client.get("/api/v1/curriculum/?required=false").data["count"] == 1
    assert CurriculumItem.objects.count() == 2


def test_curriculum_roles_and_department_scope(world, client_for):
    a, b = world["a"], world["b"]
    program = Program.objects.create(institute=a["institute"], unit=a["unit"], name="Computing")
    item = CurriculumItem.objects.create(institute=a["institute"], program=program, course=a["course"], stage=1)
    batch = AdmissionBatch.objects.create(institute=a["institute"], program=program, year=a["year"], name="Intake")
    for role in ["teacher", "student"]:
        client=client_for(a,role)
        assert client.get(f"/api/v1/curriculum/{item.pk}/").status_code == 404
        assert client.get(f"/api/v1/batches/{batch.pk}/").status_code == 404
        assert client.get("/api/v1/institute-setup/").status_code == 403
    head=client_for(a,"head")
    assert head.get(f"/api/v1/curriculum/{item.pk}/").status_code == 200
    assert head.patch(f"/api/v1/curriculum/{item.pk}/", {"required":False},format="json").status_code == 403
    assert head.get("/api/v1/institute-setup/").status_code == 403
    assert client_for(b,"admin").get(f"/api/v1/curriculum/{item.pk}/").status_code == 404
    section=Section.objects.create(institute=a["institute"],program=program,batch=batch,name="A")
    a["offering"].section=section; a["offering"].save()
    assert client_for(a,"student").get(f"/api/v1/curriculum/{item.pk}/").status_code == 200
    root=User.objects.create_superuser(username="root",email="root@example.test",password="SafePassword123!")
    assert client_for({**a,"root":root},"root").get("/api/v1/curriculum/").status_code == 403


def test_school_setup_no_mandatory_department_or_credits(world, client_for):
    a=world["a"]; a["institute"].kind="school"; a["institute"].save()
    client=client_for(a,"admin")
    program=client.post("/api/v1/programs/", {"name":"Grade 5","structure":"annual","duration_terms":1},format="json")
    assert program.status_code == 201, program.data
    subject=client.post("/api/v1/courses/", {"name":"English","code":"EN5","credit_hours":None},format="json")
    assert subject.status_code == 201
    mapping=client.post("/api/v1/curriculum/", {"program":program.data["id"],"course":subject.data["id"],"stage":1},format="json")
    assert mapping.status_code == 201
    status=client.get("/api/v1/institute-setup/")
    assert status.status_code == 200
    steps={step["key"]:step for step in status.data["steps"]}
    assert steps["units"]["optional"] and steps["appointments"]["optional"]
    assert steps["curriculum"]["complete"]
    assert not steps["batches"]["complete"]
    assert not status.data["ready"]
    assert client.patch(f'/api/v1/courses/{subject.data["id"]}/',{"active":False},format="json").status_code == 200
    assert client.post("/api/v1/offerings/",{"course":subject.data["id"],"term":str(a["term"].pk),"title":"Archived subject"},format="json").status_code == 400
