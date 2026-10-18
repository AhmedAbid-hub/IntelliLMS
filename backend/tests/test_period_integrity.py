from datetime import date

import pytest
from apps.accounts.models import Membership
from apps.academics.models import Program, Section, StudentPlacement, Term, Offering, Year
from apps.learning.models import AttendanceSession, ManualGrade

pytestmark = pytest.mark.django_db


def test_new_offering_requires_compatible_explicit_period_but_legacy_is_maintainable(world, client_for):
    a = world['a']
    program = Program.objects.create(institute=a['institute'], name='Legacy annual program', structure='annual')
    section = Section.objects.create(institute=a['institute'], program=program, name='A')
    a['term'].period_type = 'semester'; a['term'].save()
    admin = client_for(a, 'admin')
    values = {'title': 'Incompatible', 'course': str(a['course'].pk), 'section': str(section.pk), 'term': str(a['term'].pk)}
    result = admin.post('/api/v1/offerings/', values, format='json')
    assert result.status_code == 400 and 'term' in result.data
    # Existing ambiguous records can be renamed, but are not silently converted.
    a['offering'].section = section; a['offering'].save()
    assert admin.patch(f'/api/v1/offerings/{a["offering"].pk}/', {'title': 'Historical course'}, format='json').status_code == 200
    a['term'].period_type = ''; a['term'].save()
    assert admin.post('/api/v1/offerings/', values, format='json').status_code == 201


def test_attendance_calendar_boundaries_and_legacy_maintenance(world, client_for):
    a = world['a']; teacher = client_for(a, 'teacher'); admin = client_for(a, 'admin')
    values = {'offering': str(a['offering'].pk), 'title': 'Boundary attendance'}
    for invalid in ['2026-07-31', '2027-01-01']:
        result = teacher.post('/api/v1/attendance-sessions/', {**values, 'date': invalid}, format='json')
        assert result.status_code == 400 and 'date' in result.data
    saved = teacher.post('/api/v1/attendance-sessions/', {**values, 'date': '2026-08-01'}, format='json')
    assert saved.status_code == 201, saved.data
    session_url = f'/api/v1/attendance-sessions/{saved.data["id"]}/'
    assert teacher.patch(session_url, {'date': '2026-07-31'}, format='json').status_code == 400
    term_url = f'/api/v1/terms/{a["term"].pk}/'
    assert admin.patch(term_url, {'start': '2026-08-02'}, format='json').status_code == 400
    assert admin.patch(term_url, {'start': '2026-07-31'}, format='json').status_code == 200
    assert client_for(world['b'], 'admin').patch(term_url, {'start': '2026-08-02'}, format='json').status_code == 404
    assert client_for(a, 'student').post('/api/v1/attendance-sessions/', {**values, 'date': '2026-08-01'}, format='json').status_code == 403
    legacy = AttendanceSession.objects.create(institute=a['institute'], offering=a['offering'], title='Legacy outside date', date=date(2026, 1, 1))
    assert teacher.patch(f'/api/v1/attendance-sessions/{legacy.pk}/', {'title': 'Legacy retained'}, format='json').status_code == 200
    assert AttendanceSession.objects.get(pk=legacy.pk).date == date(2026, 1, 1)


def test_program_duration_and_structure_cannot_reinterpret_recorded_placements(world, client_for):
    a = world['a']; admin = client_for(a, 'admin')
    program = Program.objects.create(institute=a['institute'], name='Degree', duration_terms=6)
    placement = StudentPlacement.objects.create(institute=a['institute'], membership=Membership.objects.get(user=a['student']), program=program, stage=5, term=a['term'], year=a['year'], reason='Recorded stage')
    url = f'/api/v1/programs/{program.pk}/'
    assert admin.patch(url, {'duration_terms': 4}, format='json').status_code == 400
    assert admin.patch(url, {'structure': 'annual'}, format='json').status_code == 400
    assert admin.patch(url, {'duration_terms': 7, 'name': 'Degree renamed'}, format='json').status_code == 200
    placement.refresh_from_db(); assert placement.stage == 5
    # Placements alone protect period type, even without a course offering.
    empty_term = Term.objects.create(institute=a['institute'], year=a['year'], name='Placement only', start=a['term'].start, end=a['term'].end)
    placement.term = empty_term; placement.save()
    assert admin.patch(f'/api/v1/terms/{empty_term.pk}/', {'period_type': 'semester'}, format='json').status_code == 400


def test_admission_and_bulk_enrollment_reject_incompatible_shared_periods(world, client_for):
    a = world['a']; admin = client_for(a, 'admin')
    program = Program.objects.create(institute=a['institute'], unit=a['unit'], name='Legacy annual', structure='annual')
    member = Membership.objects.get(user=a['student'])
    StudentPlacement.objects.create(institute=a['institute'], membership=member, program=program, year=a['year'], stage=1, reason='Legacy annual placement')
    a['term'].period_type = 'semester'; a['term'].save()
    # Omitting the optional placement period cannot bypass each selected course's period check.
    transfer = {'program': str(program.pk), 'year': str(a['year'].pk), 'stage': 1, 'offerings': [str(a['offering'].pk)], 'reason': 'Attempt incompatible placement'}
    assert admin.post(f'/api/v1/memberships/{member.pk}/transfer/', transfer, format='json').status_code == 400
    bulk = {'operation': 'enroll', 'students': [str(a['student'].pk)], 'reason': 'Attempt incompatible enrollment'}
    assert admin.post(f'/api/v1/offerings/{a["offering"].pk}/bulk-enrollment/', bulk, format='json').status_code == 400
    assert member.placements.count() == 1


def test_original_course_assessment_and_period_relationships_are_immutable(world, client_for):
    a = world['a']; admin = client_for(a, 'admin'); teacher = client_for(a, 'teacher')
    year = Year.objects.create(institute=a['institute'], name='Other year', start=a['year'].start, end=a['year'].end)
    period = Term.objects.create(institute=a['institute'], year=year, name='Other period', start=a['term'].start, end=a['term'].end)
    other = Offering.objects.create(institute=a['institute'], course=a['course'], term=period, title='Other course')
    other.teachers.add(a['teacher'])
    grade = ManualGrade.objects.create(institute=a['institute'], offering=a['offering'], student=a['student'], title='Historical result', marks=81, max_marks=100, released=True)
    assert admin.patch(f'/api/v1/offerings/{a["offering"].pk}/', {'term': str(period.pk)}, format='json').status_code == 400
    assert admin.patch(f'/api/v1/terms/{a["term"].pk}/', {'year': str(year.pk)}, format='json').status_code == 400
    assert teacher.patch(f'/api/v1/manual-grades/{grade.pk}/', {'offering': str(other.pk)}, format='json').status_code == 400
    grade.refresh_from_db(); a['offering'].refresh_from_db()
    assert grade.offering_id == a['offering'].pk and grade.marks == 81 and a['offering'].term_id == a['term'].pk
