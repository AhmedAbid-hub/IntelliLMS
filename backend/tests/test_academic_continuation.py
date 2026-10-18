from datetime import date, timedelta
import pytest
from django.utils import timezone
from apps.accounts.models import User
from apps.academics.models import Offering, Term, Timetable
from apps.learning.models import Assignment


@pytest.mark.django_db
@pytest.mark.parametrize("kind", ["school", "college", "university"])
def test_program_sections_and_term_aware_scheduling(world, client_for, kind):
    a = world["a"]
    a["institute"].kind = kind
    a["institute"].save()
    client = client_for(a, "admin")
    program = {"name": "Learning pathway"}
    if kind != "school":
        program["unit"] = str(a["unit"].pk)
    result = client.post("/api/v1/programs/", program)
    assert result.status_code == 201
    assert client.post("/api/v1/programs/", program).status_code == 400
    section = {"name": "Group A", "program": result.data["id"]}
    assert client.post("/api/v1/sections/", section).status_code == 201
    assert client.post("/api/v1/sections/", section).status_code == 400
    assert (
        client_for(a, "student")
        .post("/api/v1/programs/", {"name": "Forbidden"})
        .status_code
        == 403
    )
    earlier = Term.objects.create(
        institute=a["institute"],
        year=a["year"],
        name="Earlier",
        start=date(2026, 1, 1),
        end=date(2026, 6, 30),
    )
    previous = Offering.objects.create(
        institute=a["institute"],
        term=earlier,
        course=a["course"],
        title="Earlier course",
    )
    previous.teachers.add(a["teacher"])
    Timetable.objects.create(
        institute=a["institute"],
        offering=previous,
        day=0,
        start="09:00",
        end="10:00",
        location="Room A",
    )
    meeting = {
        "offering": str(a["offering"].pk),
        "day": 0,
        "start": "09:00",
        "end": "10:00",
        "location": "Room A",
    }
    assert client.post("/api/v1/timetable/", meeting).status_code == 201
    assert client.post("/api/v1/timetable/", meeting).status_code == 400
    another = Offering.objects.create(
        institute=a["institute"],
        term=a["term"],
        course=a["course"],
        title="Other course",
    )
    Timetable.objects.create(
        institute=a["institute"],
        offering=another,
        day=0,
        start="09:30",
        end="10:30",
        location="Room B",
    )
    result = client.patch(
        f"/api/v1/offerings/{another.pk}/",
        {"teachers": [str(a["teacher"].pk)]},
        format="json",
    )
    assert result.status_code == 400
    assert another.teachers.count() == 0


@pytest.mark.django_db
def test_platform_institute_details_and_due_date_filters(world, client_for):
    a = world["a"]
    root = User.objects.create_superuser(
        username="root", email="root@test.invalid", password="secret"
    )
    client = client_for({**a, "superadmin": root}, "superadmin")
    response = client.get(f'/api/v1/institutes/{a["institute"].pk}/overview/')
    assert response.status_code == 200
    assert response.data["roles"] == {"admin": 1, "head": 1, "student": 1, "teacher": 1}
    admins = client.get(f'/api/v1/institutes/{a["institute"].pk}/administrators/').data
    assert admins["count"] == 1
    assert admins["results"][0]["username"] == "aadmin"
    assert (
        client_for(a, "admin")
        .get(f'/api/v1/institutes/{a["institute"].pk}/overview/')
        .status_code
        == 403
    )
    for index in range(55):
        Assignment.objects.create(
            institute=a["institute"],
            offering=a["offering"],
            title=f"Past {index}",
            published=True,
            due_at=timezone.now() - timedelta(days=1),
        )
    assignment = Assignment.objects.create(
        institute=a["institute"],
        offering=a["offering"],
        title="Upcoming",
        published=True,
        due_at=timezone.now() + timedelta(days=1),
    )
    response = client_for(a, "student").get(
        "/api/v1/assignments/",
        {"due_at__gte": timezone.now().isoformat(), "ordering": "due_at"},
    )
    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == str(assignment.pk)
