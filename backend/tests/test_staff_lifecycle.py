import pytest
from apps.accounts.models import Membership, User
from apps.academics.models import Enrollment
from apps.insights.models import Audit


def member(data, role):
    return Membership.objects.get(institute=data["institute"], user=data[role])


@pytest.mark.django_db
def test_removal_requires_reassignment_and_preserves_history(world, client_for):
    a = world["a"]
    admin = client_for(a, "admin")
    teacher = member(a, "teacher")
    head = member(a, "head")
    head.can_teach = True
    head.save()
    url = f"/api/v1/memberships/{teacher.pk}/transition/"
    assert admin.get(f"/api/v1/memberships/{teacher.pk}/impact/").data["active_assignments"] == 1
    assert admin.post(url, {"operation": "remove", "reason": "Staff departure"}, format="json").status_code == 400
    teacher.refresh_from_db()
    assert teacher.active
    for role in ["head", "teacher", "student"]:
        assert client_for(a, role).post(url, {"operation": "remove", "reason": "Staff departure", "replacement": str(head.pk)}, format="json").status_code in [403, 404]
    assert client_for(world["b"], "admin").post(url, {"operation": "remove", "reason": "Staff departure"}, format="json").status_code == 404
    response = admin.post(url, {"operation": "remove", "reason": "Staff departure", "replacement": str(head.pk)}, format="json")
    assert response.status_code == 200, response.data
    teacher.refresh_from_db()
    assert not teacher.active and teacher.removed_at
    assert a["offering"].teachers.filter(pk=a["head"].pk).exists()
    assert not a["offering"].teachers.filter(pk=a["teacher"].pk).exists()
    assert Enrollment.objects.filter(offering=a["offering"]).count() == 1
    assert User.objects.filter(pk=a["teacher"].pk).exists()
    assert client_for(a, "teacher").get("/api/v1/offerings/").status_code == 403
    assert Audit.objects.get(action="Membership.remove").detail["previous"]["active"]
    assert admin.post(url, {"operation": "reactivate", "reason": "Returned to institute"}, format="json").status_code == 200
    teacher.refresh_from_db()
    assert teacher.active and teacher.removed_at is None
    assert not a["offering"].teachers.filter(pk=a["teacher"].pk).exists()


@pytest.mark.django_db
def test_replace_head_is_scoped_atomic_and_old_access_changes(world, client_for):
    a = world["a"]
    old = member(a, "head")
    teacher = member(a, "teacher")
    url = f"/api/v1/memberships/{old.pk}/replace-head/"
    admin = client_for(a, "admin")
    body = {"replacement": str(member(world["b"], "teacher").pk), "outgoing_action": "teacher", "reason": "New department leadership"}
    assert admin.post(url, body, format="json").status_code == 400
    old.refresh_from_db()
    assert old.role == "head"
    body["replacement"] = str(teacher.pk)
    assert client_for(a, "head").post(url, body, format="json").status_code == 403
    assert admin.post(url, body, format="json").status_code == 200
    old.refresh_from_db(); teacher.refresh_from_db()
    assert old.role == "teacher" and teacher.role == "head" and teacher.can_teach
    assert a["offering"].teachers.filter(pk=teacher.user_id).exists()
    assert client_for(a, "head").get("/api/v1/offerings/").data["count"] == 0
    assert Audit.objects.filter(action="Membership.replace_head").count() == 1


@pytest.mark.django_db
def test_privileged_role_changes_require_lifecycle_and_last_admin_survives(world, client_for):
    a = world["a"]
    teacher = member(a, "teacher")
    admin = client_for(a, "admin")
    assert admin.patch(f"/api/v1/memberships/{teacher.pk}/", {"role": "admin"}, format="json").status_code == 400
    assert admin.post(f"/api/v1/memberships/{teacher.pk}/transition/", {"operation": "change_role", "role": "admin", "reason": "Unauthorized elevation"}, format="json").status_code == 403
    response = admin.post("/api/v1/memberships/", {"username": "new-admin", "email": "new-admin@example.test", "role": "admin"}, format="json")
    assert response.status_code == 403, response.data
    superuser = User.objects.create_superuser(username="platform", email="platform@example.test", password="Secure-test-password42!")
    platform = client_for({**a, "super": superuser}, "super")
    administrator = member(a, "admin")
    response = platform.post(f"/api/v1/memberships/{administrator.pk}/transition/", {"operation": "remove", "reason": "Replace administration"}, format="json")
    assert response.status_code == 400
    administrator.refresh_from_db()
    assert administrator.active

# Regression: omitted teaching flags must preserve a teaching head's access.
@pytest.mark.django_db
def test_head_reactivation_preserves_teaching_flag(world, client_for):
    a = world['a']
    head = member(a, 'head')
    head.can_teach = True
    head.active = False
    head.save()
    response = client_for(a, 'admin').post(f'/api/v1/memberships/{head.pk}/transition/', {'operation': 'reactivate', 'reason': 'Return from leave'}, format='json')
    assert response.status_code == 200, response.data
    head.refresh_from_db()
    assert head.active and head.can_teach
    response = client_for(a, 'admin').post('/api/v1/memberships/', {'username': 'duplicatehead', 'email': 'duplicate@example.test', 'role': 'head', 'unit': str(a['unit'].pk)}, format='json')
    assert response.status_code == 400
    assert not User.objects.filter(username='duplicatehead').exists()

@pytest.mark.django_db
def test_platform_deactivation_cannot_bypass_last_admin_guard(world, client_for):
    a = world['a']
    root = User.objects.create_superuser(username='root-safety', password='Secure-test-password42!')
    platform = client_for({**a, 'root': root}, 'root')
    response = platform.patch(f'/api/v1/platform-users/{a["admin"].pk}/', {'is_active': False}, format='json')
    assert response.status_code == 400
    a['admin'].refresh_from_db()
    assert a['admin'].is_active


@pytest.mark.django_db
def test_school_departure_reassigns_without_departments_and_keeps_closed_history(world, client_for):
    from apps.academics.models import Term, Offering
    a = world['a']; a['institute'].kind = 'school'; a['institute'].save()
    a['course'].unit = None; a['course'].save()
    old = member(a, 'teacher')
    user = User.objects.create_user(username='schoolreplacement')
    replacement = Membership.objects.create(institute=a['institute'], user=user, role='teacher')
    period = Term.objects.create(institute=a['institute'], year=a['year'], name='Closed period', start=a['term'].start, end=a['term'].end, status='closed')
    past = Offering.objects.create(institute=a['institute'], course=a['course'], term=period, title='Preserved teaching history')
    past.teachers.add(old.user)
    client = client_for(a,'admin')
    assert client.get(f'/api/v1/memberships/{old.pk}/impact/').data['active_assignments'] == 1
    response = client.post(f'/api/v1/memberships/{old.pk}/transition/', {'operation':'remove', 'replacement':str(replacement.pk), 'reason':'Approved school staffing change'}, format='json')
    assert response.status_code == 200, response.data
    assert a['offering'].teachers.filter(pk=user.pk).exists()
    assert past.teachers.filter(pk=old.user_id).exists() and not past.teachers.filter(pk=user.pk).exists()
    assert client_for(a,'teacher').get('/api/v1/offerings/').status_code == 403


@pytest.mark.django_db
def test_replacement_uses_active_appointment_not_only_primary_department(world, client_for):
    from apps.accounts.models import TeacherAppointment
    a = world['a']; old = member(a,'teacher')
    user = User.objects.create_user(username='appointedreplacement')
    replacement = Membership.objects.create(institute=a['institute'], user=user, role='teacher')
    appointment = TeacherAppointment.objects.create(institute=a['institute'], membership=replacement, unit=a['unit'], reason='Approved appointment')
    data = {'operation':'remove', 'replacement':str(replacement.pk), 'reason':'Replace outgoing instructor'}
    client = client_for(a,'admin'); url = f'/api/v1/memberships/{old.pk}/transition/'
    appointment.active = False; appointment.save()
    assert client.post(url, data, format='json').status_code == 400
    appointment.active = True; appointment.save()
    response = client.post(url, data, format='json')
    assert response.status_code == 200, response.data
    assert a['offering'].teachers.filter(pk=user.pk).exists()
