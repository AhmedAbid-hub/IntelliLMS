"""Adjust chronology ONLY in Playwright's disposable fictional fixture.

No LMS live credentials/database are used; the shared guard rejects other paths.
The existing demo scores are retained, not randomly generated for inference.
"""
import os
from pathlib import Path
import sys
from datetime import timedelta
from e2e_database import database_path

database = database_path()
if not database.is_file():
    raise RuntimeError("Start the isolated browser server first.")
backend = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend))
os.environ.update(DJANGO_SETTINGS_MODULE="config.e2e_settings", DB_ENGINE="sqlite", SQLITE_NAME=str(database),
                  DEBUG="True", SECRET_KEY="isolated-e2e-only-secret")
import django
django.setup()
from django.db import transaction
from django.utils import timezone
from apps.academics.models import Offering
from apps.learning.models import Assignment, Submission

with transaction.atomic():
    offering = Offering.objects.get(title="Introduction to Computing · A", teachers__username="university.teacher")
    assignments = list(Assignment.objects.filter(offering=offering).order_by('due_at'))
    if len(assignments) != 3 or {a.title for a in assignments} != {"Foundations reflection", "Practical exercise", "Independent project"}:
        raise RuntimeError("Expected the unchanged fictional course fixture.")
    # Named lookup keeps repeated invocation deterministic.
    for title, days in [("Foundations reflection", 21), ("Practical exercise", 7)]:
        assignment = next(a for a in assignments if a.title == title)
        assignment.due_at = timezone.now() - timedelta(days=days)
        assignment.save(update_fields=['due_at'])
        Submission.objects.filter(assignment=assignment).update(submitted_at=assignment.due_at-timedelta(days=1))
print("Prepared two past assignment deadlines in the isolated fictional course; existing scores retained.")
