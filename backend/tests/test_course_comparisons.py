from datetime import timedelta
from types import SimpleNamespace
import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from apps.accounts.models import User, Membership
from apps.accounts.scope import Scope
from apps.academics.models import Program, Section, AdmissionBatch, Offering, Enrollment
from apps.learning.models import Assignment, Submission, AttendanceSession, Attendance
from apps.insights.course_reports import course_comparisons, CourseComparisonSerializer

pytestmark = pytest.mark.django_db


def attach_section(a):
    program = Program.objects.create(institute=a["institute"], unit=a["unit"], name="Program")
    batch = AdmissionBatch.objects.create(institute=a["institute"], program=program, year=a["year"], name="Batch")
    section = Section.objects.create(institute=a["institute"], program=program, batch=batch, name="Section")
    a["offering"].section = section
    a["offering"].save()
    return {"program": str(program.pk), "section": str(section.pk), "batch": str(batch.pk), "year": str(a["year"].pk)}


def test_academic_report_filters_apply_to_every_report_and_never_expand_scope(world, client_for):
    a, b = world["a"], world["b"]
    own, foreign = attach_section(a), attach_section(b)
    teacher = client_for(a, "teacher")
    for resource in ("grades", "analytics/courses", "analytics/workload"):
        for key, value in own.items():
            response = teacher.get(f"/api/v1/{resource}/", {key: value})
            assert response.status_code == 200, response.data
            assert response.data["count"] == 1
            assert teacher.get(f"/api/v1/{resource}/", {key: foreign[key]}).data["count"] == 0
            assert teacher.get(f"/api/v1/{resource}/", {key: "invalid"}).status_code == 400
    for key in own:
        assert teacher.get("/api/v1/analytics/trends/", {key: foreign[key]}).data["departments"] == []
        assert teacher.get("/api/v1/predictions/summary/", {key: foreign[key]}).data["learner_course_pairs"] == 0
    assert client_for(a, "student").get("/api/v1/analytics/courses/").status_code == 403
    # A foreign course cannot be selected into a staff comparison.
    assert teacher.get("/api/v1/analytics/courses/", {"offering": str(b["offering"].pk)}).data["count"] == 0


def test_comparison_facts_exclude_unreleased_excused_and_withdrawn_records(world, client_for):
    a = world["a"]
    past = timezone.now() - timedelta(days=1)
    assignments = [Assignment.objects.create(institute=a["institute"], offering=a["offering"], title=str(i), due_at=past, max_marks=100, published=True) for i in range(3)]
    Submission.objects.create(institute=a["institute"], assignment=assignments[0], student=a["student"], marks=40, released=True)
    Submission.objects.create(institute=a["institute"], assignment=assignments[1], student=a["student"], marks=100, released=False)
    for days, status in enumerate(("present", "absent", "excused")):
        session = AttendanceSession.objects.create(institute=a["institute"], offering=a["offering"], date=timezone.localdate() - timedelta(days=days))
        Attendance.objects.create(institute=a["institute"], session=session, student=a["student"], status=status)
    withdrawn = User.objects.create_user(username="withdrawn")
    Enrollment.objects.create(institute=a["institute"], offering=a["offering"], student=withdrawn, active=False)
    Submission.objects.create(institute=a["institute"], assignment=assignments[0], student=withdrawn, marks=100, released=True)
    row = client_for(a, "head").get("/api/v1/analytics/courses/").data["results"][0]
    assert row["learners"] == row["instructors"] == row["missing_submissions"] == 1
    assert row["assignment_average"] == 40
    assert row["released_grades"] == row["below_pass_mark"] == 1 and row["meeting_pass_mark"] == 0
    assert row["attendance_records"] == 2 and row["attendance_percentage"] == 50


def test_comparison_pagination_ordering_and_query_count_stay_bounded(world, client_for):
    a = world["a"]
    scope = Scope(SimpleNamespace(user=a["admin"], session={"institute_id": str(a["institute"].pk)}))
    with CaptureQueriesContext(connection) as first:
        assert len(CourseComparisonSerializer(course_comparisons(scope, {}), many=True).data) == 1
    Offering.objects.bulk_create([Offering(institute=a["institute"], course=a["course"], term=a["term"], title=f"Additional {i}") for i in range(30)])
    with CaptureQueriesContext(connection) as expanded:
        assert len(CourseComparisonSerializer(course_comparisons(scope, {}), many=True).data) == 31
    assert len(expanded) <= len(first) and len(expanded) <= 2
    admin = client_for(a, "admin")
    response = admin.get("/api/v1/analytics/courses/?page_size=10&ordering=-learners")
    assert response.data["count"] == 31 and len(response.data["results"]) == 10 and response.data["next"]
    assert response.data["results"][0]["id"] == str(a["offering"].pk)
    assert admin.get("/api/v1/analytics/courses/?ordering=password").status_code == 400
    assert admin.get("/api/v1/analytics/courses/?page_size=1000").status_code == 400


def test_study_year_filters_match_historical_placement_and_all_report_facts(world, client_for):
    from apps.academics.models import StudentPlacement
    a = world['a']; own = attach_section(a)
    member = Membership.objects.get(user=a['student'])
    StudentPlacement.objects.create(institute=a['institute'], membership=member, program_id=own['program'], year=a['year'], term=a['term'], stage=1, reason='Recorded first year', actor=a['admin'])
    other = User.objects.create_user(username='second-year')
    other_member = Membership.objects.create(institute=a['institute'], user=other, role='student', unit=a['unit'])
    Enrollment.objects.create(institute=a['institute'], offering=a['offering'], student=other)
    StudentPlacement.objects.create(institute=a['institute'], membership=other_member, program_id=own['program'], year=a['year'], term=a['term'], stage=2, reason='Recorded second year', actor=a['admin'])
    assignment = Assignment.objects.create(institute=a['institute'], offering=a['offering'], title='Shared assessment', due_at=timezone.now()-timedelta(days=1), max_marks=100, published=True)
    session = AttendanceSession.objects.create(institute=a['institute'], offering=a['offering'], date=timezone.localdate())
    for user, marks, status in [(a['student'], 80, 'present'), (other, 20, 'absent')]:
        Submission.objects.create(institute=a['institute'], assignment=assignment, student=user, marks=marks, released=True)
        Attendance.objects.create(institute=a['institute'], session=session, student=user, status=status)
    client = client_for(a, 'admin'); values = {'program': own['program'], 'stage': 1, 'course': str(a['course'].pk)}
    result = client.get('/api/v1/analytics/courses/', values)
    assert result.status_code == 200, result.data
    row = result.data['results'][0]
    assert row['learners'] == 1 and row['assignment_average'] == 80 and row['attendance_percentage'] == 100
    assert client.get('/api/v1/grades/', values).data['count'] == 1
    assert client.get('/api/v1/analytics/workload/', values).data['results'][0]['learners'] == 1
    trends = client.get('/api/v1/analytics/trends/', values)
    assert trends.status_code == 200, trends.data
    assert trends.data['attendance'][0]['percentage'] == 100
    assert trends.data['assignment_scores'][0]['percentage'] == 80
    assert client.get('/api/v1/analytics/courses/', {**values, 'stage': 3}).data['count'] == 0
    assert client.get('/api/v1/grades/', {**values, 'course': str(world['b']['course'].pk)}).data['count'] == 0
    assert client.get('/api/v1/grades/', {**values, 'stage': 0}).status_code == 400
    assert client_for(a, 'student').get('/api/v1/grades/', {**values, 'stage': 2}).data['count'] == 0
    searched = client.get('/api/v1/analytics/workload/', {**values, 'search': a['teacher'].username})
    assert searched.status_code == 200 and searched.data['results'][0]['learners'] == 1
