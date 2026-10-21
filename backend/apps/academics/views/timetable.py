"""Academics timetable API; extracted without changing behavior."""
from ..models import Timetable
from .base import TenantViewSet


class TimetableViewSet(TenantViewSet):
    model = Timetable

    offering_path = "offering"

    filterset_fields = [
        "offering",
        "day",
    ]
