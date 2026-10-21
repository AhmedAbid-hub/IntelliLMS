"""Academics enrollments API; extracted without changing behavior."""
from rest_framework.exceptions import ValidationError, PermissionDenied
from ..models import Enrollment
from .base import TenantViewSet


class EnrollmentViewSet(TenantViewSet):
    """
    Read-only enrollment records through standard endpoints.

    All enrollment changes must use the offering's
    bulk-enrollment action so that validation, reasons,
    audit logging, and notifications are preserved.
    """

    model = Enrollment

    write_roles = ("admin", "head")

    offering_path = "offering"

    search_fields = ["student__username", "student__first_name", "student__last_name", "offering__title"]
    ordering_fields = ["created_at", "student__username", "student__first_name", "student__last_name", "offering__title"]

    filterset_fields = [
        "offering",
        "student",
        "active",
    ]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset().select_related("student", "offering")

        if self.scope.role == "student":
            return qs.filter(
                student=self.request.user
            )

        return qs

    def create(self, request, *args, **kwargs):
        raise PermissionDenied(
            "Direct enrollment creation is disabled. "
            "Use the course offering's bulk-enrollment action "
            "with a reason to enroll students."
        )

    def update(self, request, *args, **kwargs):
        raise PermissionDenied(
            "Direct enrollment updates are disabled. "
            "Use the course offering's bulk-enrollment action "
            "with a reason to withdraw or reactivate students."
        )

    def partial_update(self, request, *args, **kwargs):
        raise PermissionDenied(
            "Direct enrollment updates are disabled. "
            "Use the course offering's bulk-enrollment action "
            "with a reason to withdraw or reactivate students."
        )

    def destroy(self, request, *args, **kwargs):
        raise ValidationError(
            "Enrollment records cannot be deleted. "
            "Use the course offering's bulk-enrollment action "
            "to withdraw students while preserving "
            "academic history."
        )
