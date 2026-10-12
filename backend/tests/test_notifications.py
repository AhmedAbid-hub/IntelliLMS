import pytest
from apps.accounts.models import Membership
from apps.learning.models import Notification, ManualGrade
from apps.learning.notifications import notify_event

pytestmark = pytest.mark.django_db


def test_event_notifications_respect_tenant_activity_preferences_and_dedup(world, client_for):
    a, b = world['a'], world['b']
    a['teacher'].notify_academic = False
    a['teacher'].save()
    Membership.objects.filter(user=a['head']).update(active=False)
    users = [a[role].pk for role in ['student', 'teacher', 'head']] + [b['student'].pk]
    for _ in range(2):
        notify_event(a['institute'], users, 'A' * 200, event_key='test-event', destination='/offerings')
    row = Notification.objects.get()
    assert row.user == a['student'] and len(row.title) == 180
    student = client_for(a, 'student')
    url = f'/api/v1/notifications/{row.pk}/'
    assert student.get(url).data['destination'] == '/offerings'
    assert client_for(a, 'admin').get(url).status_code == 404
    assert client_for(b, 'student').post(url + 'read/').status_code == 404
    assert student.post(url + 'read/').status_code == 200
    assert student.post('/api/v1/notifications/', {'title': 'Forgery'}, format='json').status_code == 403
    for destination in ['//outside.test', '/\\outside.test', 'https://outside.test', '/\n/outside.test']:
        with pytest.raises(ValueError):
            notify_event(a['institute'], users, 'Unsafe', destination=destination)
    a['institute'].active = False
    notify_event(a['institute'], users, 'Inactive', event_key='another')
    assert Notification.objects.count() == 1


def test_enrollment_notifications_only_on_changes_and_private_destination(world, client_for):
    a = world['a']
    admin = client_for(a, 'admin')
    url = f'/api/v1/offerings/{a["offering"].pk}/bulk-enrollment/'
    data = {'students': [str(a['student'].pk)], 'operation': 'withdraw', 'reason': 'Reviewed course withdrawal'}
    assert admin.post(url, data, format='json').data['changed'] == 1
    assert admin.post(url, data, format='json').data['unchanged'] == 1
    row = Notification.objects.get(user=a['student'])
    assert row.destination == '/offerings'
    data['operation'] = 'reactivate'
    assert admin.post(url, data, format='json').status_code == 200
    assert Notification.objects.filter(user=a['student'], destination=f'/course/{a["offering"].pk}').count() == 1


def test_correction_notifications_go_to_reviewers_requester_and_affected_student(world, client_for):
    a = world['a']
    grade = ManualGrade.objects.create(institute=a['institute'], offering=a['offering'], student=a['student'], title='Exam', marks=40, max_marks=100, released=True)
    teacher = client_for(a, 'teacher')
    response = teacher.post('/api/v1/corrections/', {'kind': 'manual', 'target': str(grade.pk), 'proposed': {'marks': 55}, 'reason': 'Rechecked marking sheet'}, format='json')
    assert response.status_code == 201
    assert Notification.objects.get(user=a['admin']).destination == '/academic-reviews'
    assert not Notification.objects.filter(user__in=[a['head'], a['student'], world['b']['admin']]).exists()
    decision = f'/api/v1/corrections/{response.data["id"]}/decide/'
    data = {'decision': 'approved', 'reason': 'Verified signed rubric'}
    admin = client_for(a, 'admin')
    assert admin.post(decision, data, format='json').status_code == 200
    assert Notification.objects.get(user=a['teacher']).destination == '/academic-reviews'
    assert Notification.objects.get(user=a['student']).destination == '/grades'
    assert admin.post(decision, data, format='json').status_code == 400
    assert Notification.objects.count() == 3
