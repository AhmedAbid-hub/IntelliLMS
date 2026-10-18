import pytest
from apps.accounts.models import Membership, User
from apps.academics.models import Program
from apps.insights.models import Audit

pytestmark = pytest.mark.django_db


def test_school_direct_assignments_and_forbidden_department_workflows(world, client_for):
    a, b = world['a'], world['b']
    a['institute'].kind = 'school'
    a['institute'].save(update_fields=['kind'])
    admin = client_for(a, 'admin')
    for endpoint in ['units', 'batches', 'teacher-appointments']:
        assert admin.get(f'/api/v1/{endpoint}/').status_code == 403
    assert client_for(a, 'head').get('/api/v1/offerings/').status_code == 403
    # Historical Head membership is retained for an explicit administrative transition.
    assert Membership.objects.get(user=a['head']).role == 'head'
    assert admin.post('/api/v1/units/', {'name': 'Artificial department'}, format='json').status_code == 403
    grade = admin.post('/api/v1/programs/', {'name': 'Grade 6'}, format='json')
    assert grade.status_code == 201, grade.data
    assert grade.data['structure'] == 'annual' and grade.data['duration_terms'] == 1
    assert admin.post('/api/v1/programs/', {'name': 'Invalid', 'unit': str(a['unit'].pk)}, format='json').status_code == 400
    subject = admin.post('/api/v1/courses/', {'name': 'English', 'code': 'ENG6'}, format='json')
    assert subject.status_code == 201, subject.data
    body = {'title': 'Grade 6 English', 'course': subject.data['id'], 'term': str(a['term'].pk), 'teachers': [str(a['teacher'].pk)]}
    course = admin.post('/api/v1/offerings/', body, format='json')
    assert course.status_code == 201, course.data
    audit = Audit.objects.get(action='Offering.teacher_assignments', object_id=str(course.data['id']))
    assert audit.detail['administrative_override'] is False
    assert admin.patch(f'/api/v1/offerings/{course.data["id"]}/', {'teachers': [str(b['teacher'].pk)]}, format='json').status_code == 400
    assert client_for(a, 'teacher').patch(f'/api/v1/offerings/{course.data["id"]}/', {'teachers': []}, format='json').status_code == 403
    member = Membership.objects.get(user=a['teacher'])
    assert admin.post(f'/api/v1/memberships/{member.pk}/transition/', {'operation': 'change_role', 'role': 'head', 'unit': str(a['unit'].pk), 'reason': 'Invalid school leadership'}, format='json').status_code == 403
    invalid_head = admin.post('/api/v1/memberships/', {'username': 'invalidhead', 'email': 'invalid@example.test', 'role': 'head', 'unit': str(a['unit'].pk)}, format='json')
    assert invalid_head.status_code == 400
    assert not User.objects.filter(username='invalidhead').exists()
    profile = admin.get('/api/v1/auth/me/').data['institute_profile']
    assert profile['academic_config']['direct_teacher_assignment'] is True


@pytest.mark.parametrize('kind,duration,structure', [('school', 1, 'annual'), ('college', 2, 'annual'), ('university', 8, 'semester')])
def test_program_defaults_are_type_specific_and_existing_history_is_preserved(world, client_for, kind, duration, structure):
    a = world['a']
    a['institute'].kind = kind
    a['institute'].save(update_fields=['kind'])
    legacy = Program.objects.create(institute=a['institute'], name='Legacy', structure='semester', duration_terms=6)
    admin = client_for(a, 'admin')
    created = admin.post('/api/v1/programs/', {'name': 'New curriculum'}, format='json')
    assert created.status_code == 201, created.data
    assert (created.data['duration_terms'], created.data['structure']) == (duration, structure)
    incompatible = 'annual' if structure == 'semester' else 'semester'
    assert admin.post('/api/v1/programs/', {'name': 'Incompatible type', 'structure': incompatible}, format='json').status_code == 400
    assert admin.patch(f'/api/v1/programs/{legacy.pk}/', {'name': 'Legacy retained'}, format='json').status_code == 200
    legacy.refresh_from_db()
    assert legacy.structure == 'semester' and legacy.duration_terms == 6
    if kind == 'college':
        assert admin.post('/api/v1/programs/', {'name': 'Four year', 'duration_terms': 4}, format='json').status_code == 201
        assert admin.post('/api/v1/programs/', {'name': 'Invalid semester', 'structure': 'semester'}, format='json').status_code == 400
        steps = {row['key'] for row in admin.get('/api/v1/institute-setup/').data['steps']}
        assert {'units', 'heads', 'appointments'} <= steps and 'batches' not in steps


def test_new_institute_type_required_and_legacy_type_is_not_rewritten(world, client_for):
    a = world['a']
    root = User.objects.create_superuser(username='type-root', email='root@example.test', password='SafePassword123!')
    platform = client_for({**a, 'root': root}, 'root')
    for extra in ({}, {'kind': 'other'}):
        assert platform.post('/api/v1/institutes/', {'name': 'New', 'code': 'new', **extra}, format='json').status_code == 400
    assert platform.patch(f'/api/v1/institutes/{a["institute"].pk}/', {'kind': 'school'}, format='json').status_code == 400
    a['institute'].kind = 'other'
    a['institute'].save(update_fields=['kind'])
    assert platform.patch(f'/api/v1/institutes/{a["institute"].pk}/', {'name': 'Legacy renamed', 'kind': 'other'}, format='json').status_code == 200
    a['institute'].refresh_from_db()
    assert a['institute'].kind == 'other'
