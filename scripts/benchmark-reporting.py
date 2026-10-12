"""Repeatable reporting smoke benchmark in an EMPTY, dedicated PostgreSQL DB.

Set POSTGRES_* for a database named intellilms_benchmark. This script refuses any
other database, non-PostgreSQL connection, or database with existing tables.
It creates fictional records only; output is measurement, not an SLA.
"""

import argparse
from datetime import date, timedelta
import json
import os
from pathlib import Path
import sys
from time import perf_counter

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--students", type=int, default=2000)
args = parser.parse_args()
if not 100 <= args.students <= 10000:
    parser.error("Choose 100–10000 students for this bounded benchmark.")
os.environ["DB_ENGINE"] = "postgresql"
os.environ["DEBUG"] = "True"
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["ALLOWED_HOSTS"] = "testserver,localhost,127.0.0.1"
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import django

django.setup()
from django.core.management import call_command
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient
from apps.accounts.models import Institute, User, Membership
from apps.academics.models import Unit, Year, Term, Course, Offering, Enrollment
from apps.learning.models import Assignment, Submission

if (
    connection.vendor != "postgresql"
    or connection.settings_dict["NAME"] != "intellilms_benchmark"
):
    raise SystemExit(
        "Only the dedicated PostgreSQL intellilms_benchmark database is allowed."
    )
if connection.introspection.table_names():
    raise SystemExit("Refusing to modify a database with existing tables.")
call_command("migrate", interactive=False, verbosity=0)
institute = Institute.objects.create(
    name="Fictional benchmark institute", code="benchmark", kind="university"
)
unit = Unit.objects.create(institute=institute, name="Computing")
year = Year.objects.create(
    institute=institute, name="2026", start=date(2026, 1, 1), end=date(2026, 12, 31)
)
term = Term.objects.create(
    institute=institute, year=year, name="Term", start=year.start, end=year.end
)
admin = User.objects.create(
    username="benchmark_admin",
    email="admin@benchmark.invalid",
    password="!",
    is_superuser=True,
)
students = User.objects.bulk_create(
    [
        User(username=f"benchmark_{i:05}", email=f"{i}@benchmark.invalid", password="!")
        for i in range(args.students)
    ]
)
Membership.objects.bulk_create(
    [
        Membership(institute=institute, user=student, role="student", unit=unit)
        for student in students
    ]
)
assignments = []
for i in range(4):
    course = Course.objects.create(
        institute=institute, unit=unit, name=f"Course {i}", code=f"B{i}"
    )
    offering = Offering.objects.create(
        institute=institute, course=course, term=term, title=course.name
    )
    offering.teachers.add(admin)
    assignments.append(
        Assignment.objects.create(
            institute=institute,
            offering=offering,
            title="Assessment",
            published=True,
            due_at=timezone.now() + timedelta(days=1),
        )
    )
Enrollment.objects.bulk_create(
    [
        Enrollment(
            institute=institute, offering=assignments[i % 4].offering, student=student
        )
        for i, student in enumerate(students)
    ]
)
Submission.objects.bulk_create(
    [
        Submission(
            institute=institute,
            assignment=assignments[i % 4],
            student=student,
            text="Fictional work",
            marks=i % 101,
            released=True,
        )
        for i, student in enumerate(students)
    ]
)
client = APIClient()
client.force_login(admin)
session = client.session
session["institute_id"] = str(institute.pk)
session.save()
measurements = {}
for name, path in [
    ("grades_25", "/api/v1/grades/"),
    ("grades_100", "/api/v1/grades/?page_size=100"),
    ("workload", "/api/v1/analytics/workload/"),
    ("trends", "/api/v1/analytics/trends/"),
    ("csv", "/api/v1/reports/"),
]:
    started = perf_counter()
    with CaptureQueriesContext(connection) as captured:
        response = client.get(path)
        assert response.status_code == 200, (path, response.status_code)
        if name == "csv":
            rows = sum(chunk.count(b"\n") for chunk in response.streaming_content) - 1
            assert rows == args.students
        elif name.startswith("grades"):
            rows = len(response.data["results"])
            assert response.data["count"] == args.students
            assert rows == (100 if name.endswith("100") else 25)
        elif name == "workload":
            rows = len(response.data["results"])
            assert response.data["results"][0]["learners"] == args.students
        else:
            rows = len(response.data["departments"])
            assert response.data["departments"][0]["learners"] == args.students
    measurements[name] = {
        "seconds": round(perf_counter() - started, 3),
        "sql_queries": len(captured),
        "rows": rows,
    }
print(
    json.dumps(
        {
            "database": "PostgreSQL 17 in local Docker",
            "students": args.students,
            "courses": 4,
            "conditions": "Single sequential run, DEBUG query capture enabled, shared development host; not a production capacity guarantee.",
            "measurements": measurements,
        },
        indent=2,
    )
)
