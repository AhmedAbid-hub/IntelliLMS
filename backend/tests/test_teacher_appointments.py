import pytest
from apps.accounts.models import Membership, TeacherAppointment, User
from apps.academics.models import Unit
from apps.insights.models import Audit


@pytest.mark.django_db
def test_provision_appoint_assign_withdraw_preserves_identity(world,client_for):
    a=world['a']; admin=client_for(a,'admin'); head=client_for(a,'head')
    provision=admin.post('/api/v1/memberships/',{'username':'newteacher','email':'newteacher@example.test','role':'teacher','eligible_units':[str(a['unit'].pk)]},format='json')
    assert provision.status_code==201,provision.data
    member=Membership.objects.get(pk=provision.data['id'])
    assert not member.appointments.exists()
    course=f'/api/v1/offerings/{a["offering"].pk}/'
    assert head.patch(course,{'teachers':[str(member.user_id)]},format='json').status_code==400
    candidates=head.get('/api/v1/teacher-appointments/candidates/?search=newteacher')
    assert candidates.data['count']==1 and not candidates.data['results'][0]['appointed']
    payload={'membership':str(member.pk),'unit':str(a['unit'].pk),'reason':'Appointment for upcoming semester'}
    assert admin.post('/api/v1/teacher-appointments/',payload,format='json').status_code==403
    response=head.post('/api/v1/teacher-appointments/',payload,format='json')
    assert response.status_code==201,response.data
    assert head.post('/api/v1/teacher-appointments/',payload,format='json').status_code==200
    assert head.patch(course,{'teachers':[str(member.user_id)]},format='json').status_code==200
    teacher=client_for({**a,'new':member.user},'new')
    assert teacher.get(course).status_code==200
    previous=client_for(a,'teacher'); assert previous.get(course).status_code==404
    withdraw=f'/api/v1/teacher-appointments/{response.data["id"]}/withdraw/'
    assert head.post(withdraw,{'reason':'End semester duties'},format='json').status_code==400
    assert head.patch(course,{'teachers':[]},format='json').status_code==200
    assert head.post(withdraw,{'reason':'End semester duties'},format='json').status_code==200
    assert teacher.get(course).status_code==404
    assert User.objects.filter(pk=member.user_id,is_active=True).exists()
    assert member.appointments.filter(active=False).count()==1
    assert Audit.objects.filter(action='TeacherAppointment.appoint').count()==1
    assert Audit.objects.filter(action='TeacherAppointment.withdraw').count()==1


@pytest.mark.django_db
def test_appointment_department_tenant_and_role_boundaries(world,client_for):
    a,b=world['a'],world['b']; head=client_for(a,'head')
    other=Unit.objects.create(institute=a['institute'],name='Different department')
    user=User.objects.create_user(username='otherteacher',email='otherteacher@example.test')
    member=Membership.objects.create(institute=a['institute'],user=user,role='teacher',unit=other)
    payload={'membership':str(member.pk),'unit':str(a['unit'].pk),'reason':'Teaching appointment'}
    assert head.post('/api/v1/teacher-appointments/',payload,format='json').status_code==403
    assert head.get('/api/v1/teacher-appointments/candidates/?search=otherteacher').data['count']==0
    assert head.post('/api/v1/teacher-appointments/',{**payload,'unit':str(other.pk)},format='json').status_code==403
    assert head.post('/api/v1/teacher-appointments/',{**payload,'membership':str(Membership.objects.get(user=b['teacher']).pk)},format='json').status_code==404
    for role in ['teacher','student']:
        assert client_for(a,role).get('/api/v1/teacher-appointments/').status_code==403
        assert client_for(a,role).post('/api/v1/teacher-appointments/',payload,format='json').status_code==403
    foreign=TeacherAppointment.objects.get(membership__user=b['teacher'])
    assert head.get(f'/api/v1/teacher-appointments/{foreign.pk}/').status_code==404
    member.eligible_units.add(a['unit'])
    assert head.post('/api/v1/teacher-appointments/',payload,format='json').status_code==201
    result=client_for(a,'admin').patch(f'/api/v1/memberships/{member.pk}/',{'eligible_units':[]},format='json')
    assert result.status_code==400
    assert client_for(a,'admin').patch(f'/api/v1/memberships/{member.pk}/',{'eligible_units':[str(b['unit'].pk)]},format='json').status_code==400


@pytest.mark.django_db
def test_candidates_exclude_inactive_accounts_and_preserve_existing_appointments(world,client_for):
    a=world['a'];admin=client_for(a,'admin');head=client_for(a,'head')
    original=TeacherAppointment.objects.get(membership__user=a['teacher'])
    teacher_ids=set(a['offering'].teachers.values_list('pk',flat=True))
    created=admin.post('/api/v1/memberships/',{'username':'eligible-additional','email':'eligible-additional@example.test','role':'teacher','eligible_units':[str(a['unit'].pk)]},format='json')
    assert created.status_code==201
    member=Membership.objects.get(pk=created.data['id'])
    assert member.unit_id is None  # Eligibility alone is sufficient; no primary department required.
    endpoint='/api/v1/teacher-appointments/candidates/'
    rows=head.get(endpoint).data['results']
    assert any(str(row['id'])==str(member.pk) and not row['appointed'] for row in rows)
    assert any(str(row['id'])==str(original.membership_id) and row['appointed'] for row in rows)
    payload={'membership':str(member.pk),'unit':str(a['unit'].pk),'reason':'Authorized departmental appointment'}
    member.active=False;member.save()
    assert head.get(endpoint+'?search=eligible-additional').data['count']==0
    assert head.post('/api/v1/teacher-appointments/',payload,format='json').status_code==404
    member.active=True;member.save();member.user.is_active=False;member.user.save()
    assert head.get(endpoint+'?search=eligible-additional').data['count']==0
    assert head.post('/api/v1/teacher-appointments/',payload,format='json').status_code==404
    member.user.is_active=True;member.user.save()
    assert head.post('/api/v1/teacher-appointments/',payload,format='json').status_code==201
    assert head.get(endpoint+'?search=eligible-additional').data['results'][0]['appointed'] is True
    original.refresh_from_db();assert original.active
    assert set(a['offering'].teachers.values_list('pk',flat=True))==teacher_ids
