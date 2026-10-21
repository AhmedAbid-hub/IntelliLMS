"""Academics course offerings API; extracted without changing behavior."""
from rest_framework.exceptions import PermissionDenied
from apps.accounts.institution import academic_config
from apps.insights.models import Audit
from ..models import Offering
from ..enrollment import EnrollmentActions
from .base import TenantViewSet


class OfferingViewSet(EnrollmentActions, TenantViewSet):
    model = Offering

    write_roles = ("admin", "head")

    search_fields = [
        "title",
        "course__name",
        "course__code",
    ]

    filterset_fields = [
        "term",
        "archived",
        "course",
    ]

    def create(self, request, *args, **kwargs):
        if self.scope.role != "admin":
            raise PermissionDenied(
                "Institute Admin creates offerings; "
                "Department Heads assign appointed teachers."
            )

        return super().create(
            request,
            *args,
            **kwargs,
        )

    def update(self, request, *args, **kwargs):
        if (
            self.scope.role == "head"
            and set(request.data) - {"teachers"}
        ):
            raise PermissionDenied(
                "Department Heads change teaching assignments. "
                "Institute Admin manages offering details."
            )

        return super().update(
            request,
            *args,
            **kwargs,
        )

    def audit_assignments(self, serializer, previous):
        current = [
            str(value)
            for value in serializer.instance.teachers.values_list(
                "pk",
                flat=True,
            )
        ]

        if set(previous) != set(current):
            from apps.learning.notifications import notify_event
            import uuid

            event = (
                f"teaching:{serializer.instance.pk}:"
                f"{uuid.uuid4()}"
            )

            notify_event(
                self.scope.institute,
                set(current) - set(previous),
                "Teaching assignment: "
                + serializer.instance.title,
                event_key=event,
                destination=(
                    f"/course/{serializer.instance.pk}"
                ),
            )

            notify_event(
                self.scope.institute,
                set(previous) - set(current),
                "Teaching assignment ended: "
                + serializer.instance.title,
                event_key=event + ":ended",
                destination="/offerings",
            )

            Audit.objects.create(
                institute=self.scope.institute,
                actor=self.request.user,
                action="Offering.teacher_assignments",
                object_id=str(serializer.instance.pk),
                detail={
                    "previous": previous,
                    "current": current,
                    "administrative_override": (
                        self.scope.role == "admin" and not academic_config(self.scope.institute)["direct_teacher_assignment"]
                    ),
                    "reason": getattr(
                        serializer,
                        "assignment_reason",
                        "Department assignment",
                    ),
                },
            )

    def perform_create(self, serializer):
        super().perform_create(serializer)

        self.audit_assignments(
            serializer,
            [],
        )

    def perform_update(self, serializer):
        previous = [
            str(value)
            for value in serializer.instance.teachers.values_list(
                "pk",
                flat=True,
            )
        ]

        previous_review = (
            serializer.instance.head_correction_review
        )

        super().perform_update(serializer)

        if (
            previous_review
            != serializer.instance.head_correction_review
        ):
            Audit.objects.create(
                institute=self.scope.institute,
                actor=self.request.user,
                action="Offering.review_delegation",
                object_id=str(serializer.instance.pk),
                detail={
                    "previous": previous_review,
                    "current": (
                        serializer.instance.head_correction_review
                    ),
                },
            )

        self.audit_assignments(
            serializer,
            previous,
        )

    def get_queryset(self):
        return (
            self.scope.offerings().order_by("title")
            if not getattr(
                self,
                "swagger_fake_view",
                False,
            )
            else Offering.objects.none()
        )
