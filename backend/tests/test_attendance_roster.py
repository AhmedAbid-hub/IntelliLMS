import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from apps.accounts.models import User, Membership
from apps.academics.models import Enrollment
from apps.learning.models import AttendanceSession, Attendance


@pytest.mark.django_db
def test_roster_pages_searches_and_preserves_recorded_status(world, client_for):
    a = world["a"]
    session = AttendanceSession.objects.create(institute=a["institute"], offering=a["offering"], date=timezone.localdate(), title="Roster")
    Attendance.objects.create(institute=a["institute"], session=session, student=a["student"], status="excused")
    users = User.objects.bulk_create([User(username=f"roster{i:03d}", email=f"roster{i}@example.test", first_name=f"Learner {i}") for i in range(52)])
    Membership.objects.bulk_create([Membership(institute=a["institute"], user=user, role="student") for user in users])
    Enrollment.objects.bulk_create([Enrollment(institute=a["institute"], offering=a["offering"], student=user, active=index < 51) for index, user in enumerate(users)])
    client = client_for(a, "teacher")
    url = f"/api/v1/attendance-sessions/{session.pk}/roster/"
    with CaptureQueriesContext(connection) as queries:
        response = client.get(url)
    assert response.status_code == 200
    assert response.data["count"] == 52
    assert len(response.data["results"]) == 50
    assert len(queries) <= 12  # Related names and statuses do not query per learner.
    assert response.data["results"][0]["status"] == "excused"
    second = client.get(url, {"page": 2})
    assert len(second.data["results"]) == 2
    found = client.get(url, {"search": "Learner 50"})
    assert found.data["count"] == 1
    assert found.data["results"][0]["student"] == str(users[50].pk)
    assert found.data["results"][0]["status"] is None
    assert client.get(url, {"search": "Learner 51"}).data["count"] == 0
    assert client.get(url, {"page": "no"}).status_code == 400
    assert client.get(url, {"search": "x" * 121}).status_code == 400
    assert client_for(a, "student").get(url).status_code == 403
    assert client_for(world["b"], "admin").get(url).status_code == 404
    # Same tenant alone is insufficient for a teacher or department head.
    a["offering"].teachers.clear()
    assert client_for(a, "teacher").get(url).status_code == 404
    a["course"].unit = None
    a["course"].save(update_fields=["unit"])
    assert client_for(a, "head").get(url).status_code == 404


@pytest.mark.django_db
def test_page_marking_changes_only_requested_active_students_atomically(world, client_for):
    a, b = world["a"], world["b"]
    session = AttendanceSession.objects.create(institute=a["institute"], offering=a["offering"], date=timezone.localdate(), title="Marking")
    row = Attendance.objects.create(institute=a["institute"], session=session, student=a["student"], status="late")
    client = client_for(a, "teacher")
    url = f"/api/v1/attendance-sessions/{session.pk}/mark/"
    own = {"student": str(a["student"].pk), "status": "absent"}
    foreign = {"student": str(b["student"].pk), "status": "present"}
    assert client.post(url, {"records": [own, foreign]}, format="json").status_code == 400
    row.refresh_from_db()
    assert row.status == "late"
    assert client.post(url, {"records": [own]}, format="json").status_code == 200
    history = client_for(a, "student").get("/api/v1/attendance/", {"session": str(session.pk)})
    assert history.status_code == 200 and history.data["count"] == 1
    assert history.data["results"][0]["session_label"] == "Marking"
    assert history.data["results"][0]["session_date"] == str(session.date)
    assert history.data["results"][0]["offering_label"] == a["offering"].title
    assert client_for(b, "student").get("/api/v1/attendance/", {"session": str(session.pk)}).data["count"] == 0
    Enrollment.objects.filter(student=a["student"]).update(active=False)
    own["status"] = "present"
    assert client.post(url, {"records": [own]}, format="json").status_code == 400
    row.refresh_from_db()
    assert row.status == "absent"
