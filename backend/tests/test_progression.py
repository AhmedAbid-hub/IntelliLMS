from datetime import date
import pytest
from apps.accounts.models import Membership
from apps.academics.models import Program, Year, Term, Course, Offering, CurriculumItem, StudentPlacement, ProgressionDecision, Enrollment
from apps.learning.models import ManualGrade

pytestmark = pytest.mark.django_db


def prepare(a, kind, stage=1):
    a['institute'].kind = kind
    a['institute'].grading_rules = {'pass_mark': 60, 'progression_policy': 'all_required_pass'}
    a['institute'].save()
    program = Program.objects.create(institute=a['institute'], name='Class / program', unit=None if kind == 'school' else a['unit'], structure='semester' if kind == 'university' else 'annual', duration_terms=1 if kind == 'school' else 2)
    member = Membership.objects.get(user=a['student'])
    placed = StudentPlacement.objects.create(institute=a['institute'], membership=member, program=program, year=a['year'], term=a['term'], stage=stage, reason='Initial placement', actor=a['admin'])
    CurriculumItem.objects.create(institute=a['institute'], program=program, course=a['course'], stage=stage)
    a['offering'].assignment_weight = 0; a['offering'].quiz_weight = 0; a['offering'].manual_weight = 100; a['offering'].save()
    grade = ManualGrade.objects.create(institute=a['institute'], offering=a['offering'], student=a['student'], title='Final result', marks=80, max_marks=100, released=True)
    return program, member, placed, grade


def target_for(a, program, kind, stage=2):
    year = Year.objects.create(institute=a['institute'], name='2027', start=date(2027, 1, 1), end=date(2027, 12, 31))
    term = Term.objects.create(institute=a['institute'], year=year, name='Next period', start=year.start, end=year.end, period_type=program.structure)
    course = Course.objects.create(institute=a['institute'], name='Next subject', code='NXT')
    offering = Offering.objects.create(institute=a['institute'], course=course, term=term, title='Next delivery')
    if kind == 'school':
        program = Program.objects.create(institute=a['institute'], name='Next class', duration_terms=1, structure='annual')
        stage = 1
    return {'program': str(program.pk), 'year': str(year.pk), 'term': str(term.pk), 'stage': stage, 'offerings': [str(offering.pk)]}, offering


def commit(admin, url, values):
    preview = admin.post(url, values, format='json')
    assert preview.status_code == 200, preview.data
    return admin.post(url, {**values, 'preview': False, 'confirm_review': True, 'evidence_token': preview.data['evidence_token']}, format='json')


@pytest.mark.parametrize('kind', ['school', 'college', 'university'])
def test_progression_preserves_history_and_student_released_results(world, client_for, kind):
    a = world['a']; program, member, placed, grade = prepare(a, kind)
    target, new_offering = target_for(a, program, kind)
    url = f'/api/v1/memberships/{member.pk}/progress/'
    values = {'operation': 'progress', 'expected_placement': str(placed.pk), 'target': target, 'reason': 'Board reviewed released academic results'}
    for role in ['head', 'teacher', 'student']:
        assert client_for(a, role).post(url, values, format='json').status_code == 403
    assert client_for(world['b'], 'admin').post(url, values, format='json').status_code == 404
    admin = client_for(a, 'admin')
    bad = {**values, 'target': {**target, 'year': str(world['b']['year'].pk)}}
    assert admin.post(url, bad, format='json').status_code == 400
    assert member.placements.filter(ended_at__isnull=True).count() == 1
    result = commit(admin, url, values)
    assert result.status_code == 201, result.data
    assert result.data['evidence']['all_required_pass'] is True
    placed.refresh_from_db(); assert placed.ended_at and placed.end_reason == 'progress'
    assert member.placements.count() == 2
    assert not Enrollment.objects.get(offering=a['offering'], student=a['student']).active
    assert Enrollment.objects.get(offering=new_offering, student=a['student']).active
    grade.refresh_from_db(); assert grade.marks == 80
    assert admin.post(url, values, format='json').status_code == 400
    assert ProgressionDecision.objects.count() == 1
    student = client_for(a, 'student')
    history = student.get('/api/v1/academic-history/?student=' + str(world['b']['student'].pk))
    assert history.status_code == 200 and history.data['count'] == 2
    previous_result = next(row for row in history.data['results'] if row['offering'] == str(a['offering'].pk))
    assert previous_result['score'] == 80 and previous_result['active'] is False
    assert all(row['student'] == str(a['student'].pk) for row in history.data['results'])
    assert client_for(world['b'], 'student').get(f'/api/v1/memberships/{member.pk}/progression-history/').status_code == 404
    assert student.get(f'/api/v1/memberships/{member.pk}/progression-history/').data['count'] == 1
    assert student.get('/api/v1/academic-decisions/').data['count'] == 1
    assert client_for(world['b'], 'student').get('/api/v1/academic-decisions/').data['count'] == 0
    assert admin.get('/api/v1/academic-decisions/').status_code == 403
    for role in ['head', 'teacher']:
        assert client_for(a, role).get(f'/api/v1/memberships/{member.pk}/progression-history/').status_code == 403


def test_policy_unreleased_results_stale_evidence_and_repeat(world, client_for):
    a = world['a']; program, member, placed, grade = prepare(a, 'college')
    target, _ = target_for(a, program, 'college')
    admin = client_for(a, 'admin'); url = f'/api/v1/memberships/{member.pk}/progress/'
    values = {'operation': 'progress', 'expected_placement': str(placed.pk), 'target': target, 'reason': 'Academic board decision'}
    preview = admin.post(url, values, format='json')
    grade.released = False; grade.save()
    assert admin.post(url, {**values, 'preview': False, 'confirm_review': True, 'evidence_token': preview.data['evidence_token']}, format='json').status_code == 400
    assert commit(admin, url, values).status_code == 400
    assert not ProgressionDecision.objects.exists()
    repeat = {**values, 'operation': 'repeat', 'target': {**target, 'stage': 1}}
    assert commit(admin, url, repeat).status_code == 201
    assert member.placements.get(ended_at__isnull=True).stage == 1


@pytest.mark.parametrize('operation', ['withdraw', 'complete', 'graduate'])
def test_terminal_outcomes_keep_records_and_prevent_accidental_reenrollment(world, client_for, operation):
    a = world['a']; program, member, placed, grade = prepare(a, 'university', stage=2)
    admin = client_for(a, 'admin'); url = f'/api/v1/memberships/{member.pk}/progress/'
    result = commit(admin, url, {'operation': operation, 'expected_placement': str(placed.pk), 'reason': 'Authorized academic board decision'})
    assert result.status_code == 201, result.data
    assert not member.placements.filter(ended_at__isnull=True).exists()
    assert ManualGrade.objects.filter(pk=grade.pk).exists()
    data = {'operation': 'reactivate', 'students': [str(a['student'].pk)], 'reason': 'Attempt accidental enrollment'}
    assert admin.post(f'/api/v1/offerings/{a["offering"].pk}/bulk-enrollment/', data, format='json').status_code == 400
    assert client_for(a, 'student').get('/api/v1/academic-history/').data['results'][0]['score'] == 80


def test_period_compatibility_closed_writes_and_overlapping_enrollment(world, client_for):
    a = world['a']; admin = client_for(a, 'admin')
    body = {'year': str(a['year'].pk), 'name': 'Explicit period', 'start': '2026-01-01', 'end': '2026-07-31'}
    assert admin.post('/api/v1/terms/', {**body, 'period_type': 'annual'}, format='json').status_code == 400
    period = admin.post('/api/v1/terms/', body, format='json')
    assert period.status_code == 201 and period.data['period_type'] == 'semester'
    # Old period remains unspecified; it is never silently inferred by migration or unrelated updates.
    a['term'].refresh_from_db(); assert a['term'].period_type == ''
    assert admin.patch(f'/api/v1/terms/{a["term"].pk}/', {'period_type': 'semester'}, format='json').status_code == 400
    duplicate = Offering.objects.create(institute=a['institute'], course=a['course'], term=a['term'], title='Conflicting section')
    data = {'operation': 'enroll', 'students': [str(a['student'].pk)], 'reason': 'Duplicate delivery attempt'}
    assert admin.post(f'/api/v1/offerings/{duplicate.pk}/bulk-enrollment/', data, format='json').status_code == 400
    assert admin.patch(f'/api/v1/terms/{a["term"].pk}/', {'status': 'closed'}, format='json').status_code == 200
    teacher = client_for(a, 'teacher')
    grade = {'offering': str(a['offering'].pk), 'student': str(a['student'].pk), 'title': 'Late grade', 'marks': 10, 'max_marks': 100}
    assert teacher.post('/api/v1/manual-grades/', grade, format='json').status_code == 400
    assert teacher.get('/api/v1/offerings/').status_code == 200
    assert admin.patch(f'/api/v1/terms/{a["term"].pk}/', {'status': 'active'}, format='json').status_code == 200
    assert teacher.post('/api/v1/manual-grades/', grade, format='json').status_code == 201


def test_transfer_rejects_retained_conflict_and_preserves_record_on_failure(world, client_for):
    a = world['a']; program, member, placed, grade = prepare(a, 'university')
    replacement = Offering.objects.create(institute=a['institute'], course=a['course'], term=a['term'], title='Replacement delivery')
    values = {'program': str(program.pk), 'year': str(a['year'].pk), 'term': str(a['term'].pk),
              'stage': 1, 'offerings': [str(replacement.pk)], 'reason': 'Approved replacement delivery'}
    admin = client_for(a, 'admin'); url = f'/api/v1/memberships/{member.pk}/transfer/'
    assert admin.post(url, values, format='json').status_code == 400
    assert member.placements.count() == 1
    assert Enrollment.objects.get(student=a['student'], offering=a['offering']).active
    response = admin.post(url, {**values, 'withdraw': [str(a['offering'].pk)]}, format='json')
    assert response.status_code == 200, response.data
    assert member.placements.count() == 2
    grade.refresh_from_db(); assert grade.marks == 80


def test_correction_checks_conflicts_outside_previous_period(world, client_for):
    a = world['a']; program, member, placed, _ = prepare(a, 'university')
    target, offering = target_for(a, program, 'university')
    retained = Offering.objects.create(institute=a['institute'], course=offering.course, term=offering.term, title='Retained next period delivery')
    Enrollment.objects.create(institute=a['institute'], offering=retained, student=a['student'])
    response = client_for(a, 'admin').post(f'/api/v1/memberships/{member.pk}/progress/',
        {'operation': 'correct', 'expected_placement': str(placed.pk), 'target': target, 'reason': 'Correcting an inaccurate placement'}, format='json')
    assert response.status_code == 400
    assert member.placements.count() == 1 and not ProgressionDecision.objects.exists()
