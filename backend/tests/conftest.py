import os

os.environ.setdefault("SECRET_KEY", "test-only-secret-not-for-production")
os.environ.setdefault("DEBUG", "True")
os.environ.setdefault("DB_ENGINE", "sqlite")
os.environ.setdefault("ALLOWED_HOSTS", "testserver,localhost,127.0.0.1")
import pytest
from datetime import date
from rest_framework.test import APIClient
from apps.accounts.models import User, Institute, Membership, TeacherAppointment
from apps.academics.models import Unit, Year, Term, Course, Offering, Enrollment


@pytest.fixture
def world(db):
    result = {}
    for key in ["a", "b"]:
        inst = Institute.objects.create(name=key, code=key, kind="university")
        unit = Unit.objects.create(institute=inst, name="Computing")
        year = Year.objects.create(
            institute=inst, name="2026", start=date(2026, 1, 1), end=date(2026, 12, 31)
        )
        term = Term.objects.create(
            institute=inst,
            year=year,
            name="Fall",
            start=date(2026, 8, 1),
            end=date(2026, 12, 31),
        )
        course = Course.objects.create(
            institute=inst, unit=unit, code="CS101", name="Computing"
        )
        offering = Offering.objects.create(
            institute=inst, course=course, term=term, title="Computing A"
        )
        people = {}
        for role in ["admin", "head", "teacher", "student"]:
            user = User.objects.create_user(
                username=key + role,
                email=key + role + "@example.test",
                password="Strong-demo-pass42!",
            )
            Membership.objects.create(institute=inst, user=user, role=role, unit=unit)
            people[role] = user
        offering.teachers.add(people["teacher"])
        TeacherAppointment.objects.create(institute=inst, membership=Membership.objects.get(user=people['teacher']), unit=unit, reason='Existing fixture teaching appointment')
        Enrollment.objects.create(
            institute=inst, offering=offering, student=people["student"]
        )
        result[key] = {
            "institute": inst,
            "unit": unit,
            "year": year,
            "term": term,
            "course": course,
            "offering": offering,
            **people,
        }
    return result


@pytest.fixture
def client_for():
    def make(data, role):
        client = APIClient()
        client.force_login(data[role])
        session = client.session
        session["institute_id"] = str(data["institute"].id)
        session.save()
        return client

    return make
