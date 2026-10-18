from datetime import date
from decimal import Decimal
import pytest
from django.utils import timezone
from apps.accounts.models import Membership
from apps.academics.models import Program, Section, Year, Term, Course, Offering, Enrollment, StudentPlacement, CurriculumItem
from apps.learning.models import ManualGrade
from apps.insights.models import Audit

pytestmark = pytest.mark.django_db
BANDS = [{'label': 'A', 'minimum': 80, 'points': 4}, {'label': 'C', 'minimum': 50, 'points': 2}, {'label': 'F', 'minimum': 0, 'points': 0}]


@pytest.mark.parametrize('repeat,expected,credits', [('all', 2.75, 8), ('latest', 2, 5), ('best', 3.2, 5)])
def test_configured_gpa_keeps_programs_separate_and_applies_explicit_repeat_rules(world, client_for, repeat, expected, credits):
    a = world['a']
    program = Program.objects.create(institute=a['institute'], unit=a['unit'], name='Degree', duration_terms=4)
    section = Section.objects.create(institute=a['institute'], program=program, name='A')
    a['course'].credit_hours = Decimal('3'); a['course'].save()
    a['offering'].section = section; a['offering'].assignment_weight = 0; a['offering'].quiz_weight = 0; a['offering'].manual_weight = 100; a['offering'].save()
    ManualGrade.objects.create(institute=a['institute'], offering=a['offering'], student=a['student'], title='Earlier result', marks=90, max_marks=100, released=True)
    old = Enrollment.objects.get(offering=a['offering'], student=a['student']); old.active = False; old.save()
    year = Year.objects.create(institute=a['institute'], name='2027', start=date(2027,1,1), end=date(2027,12,31))
    term = Term.objects.create(institute=a['institute'], year=year, name='Later semester', start=year.start, end=year.end)
    repeated = Offering.objects.create(institute=a['institute'], course=a['course'], term=term, section=section, title='Repeated subject', assignment_weight=0, quiz_weight=0, manual_weight=100)
    Enrollment.objects.create(institute=a['institute'], offering=repeated, student=a['student'])
    ManualGrade.objects.create(institute=a['institute'], offering=repeated, student=a['student'], title='Later result', marks=60, max_marks=100, released=True)
    subject = Course.objects.create(institute=a['institute'], name='Writing', code='WR', credit_hours=2)
    extra = Offering.objects.create(institute=a['institute'], course=subject, term=term, section=section, title='Writing', assignment_weight=0, quiz_weight=0, manual_weight=100)
    Enrollment.objects.create(institute=a['institute'], offering=extra, student=a['student'])
    ManualGrade.objects.create(institute=a['institute'], offering=extra, student=a['student'], title='Writing result', marks=60, max_marks=100, released=True)
    missing = Course.objects.create(institute=a['institute'], name='No credits', code='NC')
    uncounted = Offering.objects.create(institute=a['institute'], course=missing, term=term, section=section, title='Unreleased / no credits')
    Enrollment.objects.create(institute=a['institute'], offering=uncounted, student=a['student'])
    a['institute'].grading_rules = {'bands': BANDS, 'gpa_policy': {'method': 'credit_weighted', 'repeat': repeat}}; a['institute'].save()
    response = client_for(a,'student').get('/api/v1/academic-results/?student='+str(world['b']['student'].pk))
    assert response.status_code == 200, response.data
    assert response.data['status'] == 'ready' and len(response.data['programs']) == 1
    total = response.data['programs'][0]
    assert total['cgpa'] == expected and total['credits'] == credits
    assert [p['gpa'] for p in total['periods']] == [4, 2]
    assert len(response.data['excluded']) == 1
    assert 'Provisional' in response.data['notice']
    member = Membership.objects.get(user=a['student'])
    url = f'/api/v1/memberships/{member.pk}/academic-results/'
    assert client_for(a,'admin').get(url).data == response.data
    assert client_for(world['b'],'admin').get(url).status_code == 404
    for role in ['head', 'teacher', 'student']:
        assert client_for(a,role).get(url).status_code == 403
    assert client_for(world['b'],'student').get('/api/v1/academic-results/').data['programs'] == []


def test_gpa_policy_is_opt_in_validated_and_reasoned(world, client_for):
    a = world['a']; admin = client_for(a,'admin'); url = f'/api/v1/institutes/{a["institute"].pk}/'
    assert client_for(a,'student').get('/api/v1/academic-results/').data['status'] == 'not_configured'

    rules = {'bands': BANDS, 'gpa_policy': {'method': 'credit_weighted', 'repeat': 'latest'}}
    assert admin.patch(url, {'grading_rules': rules}, format='json').status_code == 400
    values = {'grading_rules': rules, 'policy_change_reason': 'Approved institutional GPA policy'}
    assert admin.patch(url, values, format='json').status_code == 200
    assert Audit.objects.filter(institute=a['institute'], action='Institute.update').exists()
    for bad in [{'method': 'universal', 'repeat': 'latest'}, {'method': 'credit_weighted'}, True]:
        assert admin.patch(url, {**values, 'grading_rules': {**rules, 'gpa_policy': bad}}, format='json').status_code == 400
    assert admin.patch(url, {**values, 'grading_rules': {**rules, 'bands': []}}, format='json').status_code == 400
    assert client_for(a,'teacher').patch(url, values, format='json').status_code == 403
    a['institute'].kind = 'school'; a['institute'].save()
    assert admin.patch(url, values, format='json').status_code == 400
    assert client_for(a,'student').get('/api/v1/academic-results/').data['status'] == 'not_configured'

def test_gpa_separates_degrees_counts_failures_and_explains_ambiguous_or_missing_credits(world, client_for):
    a = world['a']; member = Membership.objects.get(user=a['student'])
    programs = [Program.objects.create(institute=a['institute'], name=name) for name in ['Computing degree', 'Second degree']]
    sections = [Section.objects.create(institute=a['institute'], program=p, name='A') for p in programs]
    a['institute'].grading_rules = {'bands': BANDS, 'gpa_policy': {'method': 'credit_weighted', 'repeat': 'all'}}; a['institute'].save()
    def result(code, section, credits, mark):
        course = Course.objects.create(institute=a['institute'], code=code, name=code, credit_hours=credits)
        offering = Offering.objects.create(institute=a['institute'], course=course, section=section, term=a['term'], title=code, assignment_weight=0, quiz_weight=0, manual_weight=100)
        Enrollment.objects.create(institute=a['institute'], offering=offering, student=a['student'])
        ManualGrade.objects.create(institute=a['institute'], offering=offering, student=a['student'], title=code, marks=mark, max_marks=100, released=True)
        return course
    result('PASS', sections[0], 3, 90)
    result('FAIL', sections[0], 3, 20)
    result('SECOND', sections[1], 2, 60)
    result('NO-CREDIT', sections[0], None, 90)
    shared = result('SHARED', None, 2, 90)
    for p in programs:
        StudentPlacement.objects.create(institute=a['institute'], membership=member, program=p, term=a['term'], year=a['year'], ended_at=timezone.now(), reason='Historical placement')
        CurriculumItem.objects.create(institute=a['institute'], program=p, course=shared, stage=1)
    response = client_for(a, 'student').get('/api/v1/academic-results/')
    assert response.status_code == 200
    degrees = {row['label']: row for row in response.data['programs']}
    assert degrees['Computing degree']['cgpa'] == 2 and degrees['Computing degree']['credits'] == 6
    assert degrees['Second degree']['cgpa'] == 2 and degrees['Second degree']['credits'] == 2
    excluded = {row['label']: row['reason'] for row in response.data['excluded']}
    assert excluded['NO-CREDIT'] == 'Positive credit hours are not configured'
    assert excluded['SHARED'] == 'Academic program cannot be identified unambiguously'
    # Only one evidenced program permits attribution of a shared offering.
    CurriculumItem.objects.filter(program=programs[1], course=shared).delete()
    ready = client_for(a, 'student').get('/api/v1/academic-results/').data
    assert next(p for p in ready['programs'] if p['label'] == 'Computing degree')['cgpa'] == 2.5



@pytest.mark.parametrize('kind', ['school','college','university'])
def test_dashboard_structure_counts_are_tenant_bound_and_type_aware(world, client_for, kind):
    a = world['a']; a['institute'].kind = kind; a['institute'].save()
    Program.objects.create(institute=a['institute'], name='Own class/program')
    Program.objects.create(institute=world['b']['institute'], name='Other program')
    counts = client_for(a,'admin').get('/api/v1/analytics/').data['structure_counts']
    assert counts['program'] == 1 and counts['course'] == 1
    assert ('unit' in counts) == (kind != 'school')
    assert ('batch' in counts) == (kind == 'university')
    assert client_for(a,'student').get('/api/v1/analytics/').data['structure_counts'] == {}
