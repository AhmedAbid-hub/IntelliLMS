"""Institution policies protect future writes without rewriting academic history."""
from datetime import timedelta
from django.utils import timezone
from .models import Attendance, AttendanceSession, Attempt


def academic_lock_reason(obj):
    record = obj.session if isinstance(obj, Attendance) else obj
    if getattr(record, "finalized", False):
        return "This academic record is finalized."
    rules = record.institute.grading_rules or {}
    if isinstance(record, AttendanceSession):
        days = rules.get("attendance_edit_window_days")
        if days is not None and timezone.localdate() > record.date + timedelta(days=days):
            return "The institute's attendance editing window has closed."
    elif rules.get("lock_released_grades", False):
        released = record.quiz.released if isinstance(record, Attempt) else getattr(record, "released", False)
        if released:
            return "Institute policy protects released grades."
    return None
