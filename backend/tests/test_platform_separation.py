import pytest
from apps.accounts.models import User


@pytest.mark.django_db
def test_platform_role_cannot_use_academic_apis_even_with_selected_tenant(world, client_for):
    a = world['a']
    root = User.objects.create_superuser(username='platform-separation', email='separation@example.test', password='Secure-test-password42!')
    client = client_for({**a, 'root': root}, 'root')
    for path in ['offerings', 'assignments', 'quizzes', 'questions', 'manual-grades', 'attendance-sessions', 'units', 'enrollments', 'grades', 'analytics', 'analytics/trends', 'predictions', 'predictions/summary', 'question-bank', 'audit']:
        assert client.get(f'/api/v1/{path}/').status_code == 403, path
    assert client.post('/api/v1/assignments/', {}, format='json').status_code == 403
    assert client.get('/api/v1/platform/').status_code == 200
    assert client.get(f'/api/v1/institutes/{a["institute"].pk}/overview/').status_code == 200
    assert client.get(f'/api/v1/institutes/{a["institute"].pk}/administrators/').status_code == 200
    assert client.get('/api/v1/model-status/').status_code == 200
    assert client.get('/api/v1/memberships/').status_code == 200
    assert client.get('/api/v1/platform-users/').status_code == 200
