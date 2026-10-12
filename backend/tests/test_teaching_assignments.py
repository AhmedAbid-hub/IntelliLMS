import pytest
from apps.insights.models import Audit


@pytest.mark.django_db
def test_heads_assign_and_admin_override_requires_reason(world, client_for):
    a = world['a']; url = f'/api/v1/offerings/{a["offering"].pk}/'
    admin = client_for(a, 'admin'); head = client_for(a, 'head')
    assert admin.patch(url, {'teachers': []}, format='json').status_code == 400
    assert a['offering'].teachers.count() == 1
    assert head.patch(url, {'teachers': []}, format='json').status_code == 200
    event = Audit.objects.filter(action='Offering.teacher_assignments').latest('created_at')
    assert event.detail['previous'] == [str(a['teacher'].pk)] and event.detail['current'] == []
    assert not event.detail['administrative_override']
    assert head.patch(url, {'teachers': [str(world['b']['teacher'].pk)]}, format='json').status_code == 400
    response = admin.patch(url, {'teachers': [str(a['teacher'].pk)], 'assignment_reason': 'Emergency teaching cover'}, format='json')
    assert response.status_code == 200, response.data
    event = Audit.objects.filter(action='Offering.teacher_assignments').latest('created_at')
    assert event.detail['administrative_override'] and event.detail['reason'] == 'Emergency teaching cover'
    assert client_for(a, 'teacher').patch(url, {'teachers': []}, format='json').status_code == 403
    assert client_for(world['b'], 'head').patch(url, {'teachers': []}, format='json').status_code == 404
    a['offering'].archived = True; a['offering'].save()
    assert head.patch(url, {'teachers': []}, format='json').status_code == 400
