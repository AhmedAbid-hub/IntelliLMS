"""Executed by PostgreSQL CI; SQLite does not provide the row locking under test."""

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier

import pytest
from django.db import connection, close_old_connections
from django.utils import timezone
from rest_framework.test import APIClient
from apps.learning.models import Quiz, Question, Attempt


def race(a, requests):
    barrier = Barrier(len(requests))

    def run(spec):
        role, method, url, data = spec
        close_old_connections()
        try:
            client = APIClient()
            client.force_login(a[role])
            session = client.session
            session["institute_id"] = str(a["institute"].pk)
            session.save()
            barrier.wait(timeout=20)
            result = getattr(client, method)(url, data, format="json")
            return result.status_code
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=len(requests)) as pool:
        return list(pool.map(run, requests))


@pytest.mark.django_db(transaction=True)
def test_concurrent_question_edit_and_start(world):
    if connection.vendor != "postgresql":
        pytest.skip("Requires PostgreSQL row locks; run scripts/verify-postgres.py")
    a = world["a"]
    quiz = Quiz.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Race",
        published=True,
        opens_at=timezone.now() - timedelta(hours=1),
        closes_at=timezone.now() + timedelta(hours=1),
    )
    question = Question.objects.create(
        institute=a["institute"], quiz=quiz, prompt="Original", kind="short", marks=5
    )
    edit, start = race(
        a,
        [
            (
                "teacher",
                "patch",
                f"/api/v1/questions/{question.pk}/",
                {"prompt": "Edited"},
            ),
            ("student", "post", f"/api/v1/quizzes/{quiz.pk}/start/", {}),
        ],
    )
    assert start == 201 and edit in [200, 400]
    question.refresh_from_db()
    assert question.prompt == ("Edited" if edit == 200 else "Original")
    assert Attempt.objects.filter(quiz=quiz).count() == 1


@pytest.mark.django_db(transaction=True)
def test_concurrent_first_submission_and_grading_resubmission(world):
    if connection.vendor != "postgresql":
        pytest.skip("Requires PostgreSQL row locks; run scripts/verify-postgres.py")
    from apps.learning.models import Assignment, Submission

    a = world["a"]
    assignment = Assignment.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Race",
        published=True,
        due_at=timezone.now() + timedelta(hours=1),
    )
    url = f"/api/v1/assignments/{assignment.pk}/submit/"
    statuses = race(
        a,
        [
            ("student", "post", url, {"text": "First"}),
            ("student", "post", url, {"text": "Second"}),
        ],
    )
    assert sorted(statuses) == [201, 400]
    assert Submission.objects.filter(assignment=assignment).count() == 1
    obj = Submission.objects.get(assignment=assignment)
    original = obj.text
    assignment.allow_resubmit = True
    assignment.save()
    grade, resubmit = race(
        a,
        [
            (
                "teacher",
                "post",
                f"/api/v1/submissions/{obj.pk}/grade/",
                {"marks": 70, "released": True},
            ),
            ("student", "post", url, {"text": "Resubmitted"}),
        ],
    )
    assert grade == 200 and resubmit in [201, 400]
    obj.refresh_from_db()
    assert obj.marks == 70 and obj.released
    assert obj.text == ("Resubmitted" if resubmit == 201 else original)


@pytest.mark.django_db(transaction=True)
def test_concurrent_room_bookings_do_not_both_succeed(world):
    if connection.vendor != "postgresql":
        pytest.skip("Requires PostgreSQL row locks; run scripts/verify-postgres.py")
    from apps.academics.models import Offering, Timetable

    a = world["a"]
    second = Offering.objects.create(
        institute=a["institute"], course=a["course"], term=a["term"], title="Second"
    )
    payload = {"day": 0, "start": "09:00", "end": "10:00", "location": "Room 1"}
    result = race(
        a,
        [
            (
                "admin",
                "post",
                "/api/v1/timetable/",
                {**payload, "offering": str(offering.pk)},
            )
            for offering in [a["offering"], second]
        ],
    )
    assert sorted(result) == [201, 400]
    assert Timetable.objects.filter(institute=a["institute"]).count() == 1


@pytest.mark.django_db(transaction=True)
def test_concurrent_quiz_starts_create_one_active_attempt(world):
    if connection.vendor != "postgresql":
        pytest.skip("Requires PostgreSQL row locks; run scripts/verify-postgres.py")
    a = world["a"]
    quiz = Quiz.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Concurrent",
        published=True,
        opens_at=timezone.now() - timedelta(hours=1),
        closes_at=timezone.now() + timedelta(hours=1),
        attempt_limit=1,
    )
    Question.objects.create(
        institute=a["institute"], quiz=quiz, prompt="Explain", kind="short", marks=5
    )
    barrier = Barrier(2)

    def start():
        close_old_connections()
        try:
            client = APIClient()
            client.force_login(a["student"])
            session = client.session
            session["institute_id"] = str(a["institute"].pk)
            session.save()
            barrier.wait(timeout=10)
            response = client.post(f"/api/v1/quizzes/{quiz.pk}/start/")
            return response.status_code, response.data
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: start(), range(2)))
    assert sorted(status for status, _ in results) == [200, 201]
    assert results[0][1]["id"] == results[1][1]["id"]
    assert Attempt.objects.filter(quiz=quiz).count() == 1

@pytest.mark.django_db(transaction=True)
def test_bulk_question_authoring_serializes_with_attempt_start(world):
    if connection.vendor != 'postgresql':
        pytest.skip('Requires PostgreSQL row locks; run scripts/verify-postgres.py')
    a = world['a']
    quiz = Quiz.objects.create(institute=a['institute'], offering=a['offering'], title='Bulk race', published=True, opens_at=timezone.now() - timedelta(hours=1), closes_at=timezone.now() + timedelta(hours=1))
    Question.objects.create(institute=a['institute'], quiz=quiz, prompt='Existing', kind='short', marks=1)
    batch, start = race(a, [
        ('teacher', 'post', f'/api/v1/quizzes/{quiz.pk}/bulk-questions/', {'questions': [{'prompt': 'Added', 'kind': 'short', 'marks': 2}]}),
        ('student', 'post', f'/api/v1/quizzes/{quiz.pk}/start/', {}),
    ])
    assert start == 201 and batch in [201, 400]
    assert quiz.questions.count() == (2 if batch == 201 else 1)
    assert quiz.attempt_set.count() == 1


@pytest.mark.django_db(transaction=True)
def test_duplicate_bulk_enrollment_requests_are_idempotent(world):
    if connection.vendor != 'postgresql':
        pytest.skip('Requires PostgreSQL row locks; run scripts/verify-postgres.py')
    from apps.academics.models import Enrollment
    from apps.insights.models import Audit
    a = world['a']
    Enrollment.objects.filter(offering=a['offering'], student=a['student']).update(active=False)
    spec = ('admin', 'post', f'/api/v1/offerings/{a["offering"].pk}/bulk-enrollment/', {'students': [str(a['student'].pk)], 'operation': 'reactivate', 'reason': 'Concurrent registration'})
    assert race(a, [spec, spec]) == [200, 200]
    assert Enrollment.objects.filter(offering=a['offering'], student=a['student'], active=True).count() == 1
    assert Audit.objects.filter(action='Enrollment.bulk_reactivate').count() == 1

@pytest.mark.django_db(transaction=True)
def test_class_analysis_starts_and_chunks_serialize(world):
    if connection.vendor != 'postgresql':
        pytest.skip('Requires PostgreSQL row locks; run scripts/verify-postgres.py')
    from apps.insights.models import AnalysisRun, AnalysisItem
    a = world['a']
    start = ('teacher', 'post', '/api/v1/class-analysis/', {'offering': str(a['offering'].pk)})
    assert sorted(race(a, [start, start])) == [200, 201]
    run = AnalysisRun.objects.get()
    advance = ('teacher', 'post', f'/api/v1/class-analysis/{run.pk}/advance/', {})
    assert race(a, [advance, advance]) == [200, 200]
    run.refresh_from_db()
    assert run.status == 'completed'
    assert AnalysisItem.objects.count() == 1
    assert not AnalysisItem.objects.filter(status='pending').exists()


@pytest.mark.django_db(transaction=True)
def test_concurrent_admission_retry_creates_one_student(world):
    if connection.vendor != "postgresql":pytest.skip("Requires PostgreSQL row locks")
    import uuid
    from apps.academics.models import Program, AdmissionReceipt
    from apps.accounts.models import User
    a=world["a"];program=Program.objects.create(institute=a["institute"],unit=a["unit"],name="Concurrent admission")
    values={"key":str(uuid.uuid4()),"preview":False,"username":"concurrent-admission","email":"concurrent-admission@example.test","first_name":"Amina","last_name":"Ali","student_identifier":"RACE-1","program":str(program.pk),"year":str(a["year"].pk),"offerings":[]}
    assert sorted(race(a,[("admin","post","/api/v1/admissions/",values)]*2))==[200,201]
    assert User.objects.filter(username="concurrent-admission").count()==1
    assert AdmissionReceipt.objects.filter(institute=a["institute"]).count()==1


@pytest.mark.django_db(transaction=True)
def test_concurrent_correction_decisions_apply_only_once(world):
    if connection.vendor != "postgresql":pytest.skip("Requires PostgreSQL row locks")
    from apps.learning.models import ManualGrade, CorrectionRequest
    from apps.insights.models import Audit
    a=world["a"]
    grade=ManualGrade.objects.create(institute=a["institute"],offering=a["offering"],student=a["student"],title="Race review",marks=40,finalized=True)
    request=CorrectionRequest.objects.create(institute=a["institute"],offering=a["offering"],kind="manual",target=grade.pk,requester=a["teacher"],original={"marks":"40.00","feedback":"","released":False},proposed={"marks":"55.00","feedback":"","released":False},reason="Verified marking sheet")
    values={"decision":"approved","reason":"Independent review approved"}
    assert sorted(race(a,[("admin","post",f"/api/v1/corrections/{request.pk}/decide/",values)]*2))==[200,400]
    grade.refresh_from_db();assert grade.marks==55 and grade.finalized
    assert Audit.objects.filter(action="ManualGrade.history",object_id=str(grade.pk)).count()==1
