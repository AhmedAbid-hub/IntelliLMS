import pytest
from rest_framework.test import APIClient
from django.contrib.admin.models import LogEntry
from apps.accounts.models import User, Membership
from apps.insights.models import Audit


@pytest.mark.django_db
def test_platform_directory_status_and_account_linking(world, client_for):
    a,b=world['a'],world['b']
    for role in ['admin','head','teacher','student']:
        assert client_for(a,role).get('/api/v1/platform-users/').status_code==403
    root=User.objects.create_superuser(username='root',email='root@example.test',password='Secure-admin-pass42!')
    client=client_for({**a,'root':root},'root')
    for ordinary_role in ['teacher','student','head']:
        target=b[ordinary_role]
        assert client.get(f'/api/v1/platform-users/?search={target.username}').data['count']==0
        assert client.get(f'/api/v1/platform-users/{target.pk}/').status_code==404
        assert client.patch(f'/api/v1/platform-users/{target.pk}/',{'is_active':False},format='json').status_code==404
        membership=Membership.objects.get(user=a[ordinary_role])
        assert client.get(f'/api/v1/memberships/{membership.pk}/').status_code==404
        assert client.post(f'/api/v1/memberships/{membership.pk}/transition/',{'operation':'remove','reason':'Not authorized'},format='json').status_code==404
        assert client.post('/api/v1/memberships/',{'institute':str(a['institute'].pk),'username':'blocked','email':'blocked@example.test','role':ordinary_role},format='json').status_code==403
    directory = client.get('/api/v1/memberships/').data
    assert directory['count'] == 2
    assert {row['role'] for row in directory['results']} == {'admin'}
    assert {str(row['user']) for row in directory['results']} == {str(a['admin'].pk), str(b['admin'].pk)}
    assert client.get('/api/v1/memberships/import-template/').status_code==403
    assert client.post('/api/v1/memberships/import-csv/',{},format='json').status_code==403
    assert client.post('/api/v1/memberships/attach/',{'institute':str(a['institute'].pk),'user':str(b['student'].pk),'role':'teacher'},format='json').status_code==403
    assert client.post('/api/v1/memberships/attach/',{'institute':str(a['institute'].pk),'user':str(b['student'].pk),'role':'admin'},format='json').status_code==400
    response=client.get('/api/v1/platform-users/?search=badmin')
    assert response.data['count']==1 and 'password' not in response.data['results'][0]
    payload={'user':str(b['admin'].pk),'role':'admin','institute':str(a['institute'].pk)}
    assert client_for(a,'admin').post('/api/v1/memberships/attach/',payload,format='json').status_code==403
    assert client.post('/api/v1/memberships/attach/',payload,format='json').status_code==201
    assert client.post('/api/v1/memberships/attach/',payload,format='json').status_code==400
    assert Audit.objects.filter(institute=a['institute'],action='Membership.attach').exists()
    url=f'/api/v1/platform-users/{a["admin"].pk}/'
    active=client_for(a,'admin')
    assert client.patch(url,{'is_active':False},format='json').status_code==200
    assert active.get('/api/v1/auth/me/').status_code==403
    assert LogEntry.objects.filter(object_id=str(a['admin'].pk)).exists()
    assert client.patch(f'/api/v1/platform-users/{root.pk}/',{'is_active':False},format='json').status_code==400
    assert client.patch(url,{'is_superuser':True},format='json').status_code==200
    a['admin'].refresh_from_db(); assert not a['admin'].is_superuser
    assert client.post('/api/v1/memberships/',{'institute':str(a['institute'].pk),'username':'newadmin','email':'newadmin@example.test','role':'admin'},format='json').status_code==201


@pytest.mark.django_db
def test_platform_invitation_validates_explicit_target_without_selected_institute(world):
    root = User.objects.create_superuser(username='freshroot', password='Secure-admin-pass42!')
    client = APIClient()
    client.force_login(root)
    target = world['b']['institute']
    data = {'institute': str(target.pk), 'username': 'freshadmin', 'email': 'freshadmin@example.test', 'role': 'admin'}
    assert client.post('/api/v1/memberships/', {**data, 'unit': str(world['a']['unit'].pk)}, format='json').status_code == 400
    assert not User.objects.filter(username='freshadmin').exists()
    response = client.post('/api/v1/memberships/', data, format='json')
    assert response.status_code == 201, response.data
    assert Membership.objects.get(pk=response.data['id']).institute == target
    assert client.post('/api/v1/memberships/', {**data, 'username': 'ordinary', 'email': 'ordinary@example.test', 'role': 'student'}, format='json').status_code == 403
    assert client.post('/api/v1/memberships/', data, format='json').status_code == 400
@pytest.mark.django_db
def test_platform_counts_distinct_active_administrators_without_exposing_learner_accounts(world, client_for):
    a, b = world['a'], world['b']
    root = User.objects.create_superuser(username='count-root', email='root-count@example.test', password='Strong-demo-pass42!')
    platform = client_for({**a, 'root': root}, 'root')
    Membership.objects.create(institute=b['institute'], user=a['admin'], role='admin')
    assert platform.get('/api/v1/platform/').data['institute_administrators'] == 2
    b['admin'].is_active = False; b['admin'].save()
    assert platform.get('/api/v1/platform/').data['institute_administrators'] == 1
    Membership.objects.filter(user=a['admin']).update(active=False)
    assert platform.get('/api/v1/platform/').data['institute_administrators'] == 0
    assert client_for(a, 'student').get('/api/v1/platform/').status_code == 403
