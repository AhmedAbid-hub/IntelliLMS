from contextlib import contextmanager

from django.db import transaction
from django.db.models.deletion import ProtectedError

from rest_framework import viewsets
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.accounts.scope import Scope
from apps.accounts.models import Institute
from apps.insights.models import Audit

from .models import (
    AdmissionBatch,
    CurriculumItem,
    Unit,
    Year,
    Term,
    Program,
    Section,
    Course,
    Offering,
    Enrollment,
    Timetable,
)

from .serializers import serializer_for
from .enrollment import EnrollmentActions


class TenantViewSet(viewsets.ModelViewSet):
    model = None
    write_roles = ("admin",)
    offering_path = None
    ordering_fields = ["created_at"]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)

        if (
            self.scope.role == "superadmin"
            and self.model.__name__ != "Notification"
        ):
            raise PermissionDenied(
                "Use platform oversight and Institute Admin accounts "
                "for institutional operations."
            )

    @contextmanager
    def academic_write(self):
        # Serialize calendar and schedule edits per institute.
        # Lock during validation and saving to prevent race conditions.

        if self.model not in (
            Year,
            Term,
            Offering,
            Timetable,
            Program,
            Course,
            Section,
            AdmissionBatch,
            CurriculumItem,
        ):
            yield
            return

        self.scope.require(*self.write_roles)

        with transaction.atomic():
            Institute.objects.select_for_update().get(
                pk=self.scope.institute.pk
            )
            yield

    def create(self, request, *args, **kwargs):
        with self.academic_write():
            return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        with self.academic_write():
            return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        with self.academic_write():
            return super().destroy(request, *args, **kwargs)

    def get_serializer_class(self):
        return serializer_for(self.model)

    @property
    def scope(self):
        if not hasattr(self, "_scope"):
            self._scope = Scope(self.request)
        return self._scope

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = self.model.objects.filter(
            institute=self.scope.institute
        )

        if self.offering_path:
            qs = qs.filter(
                **{
                    self.offering_path + "__in": self.scope.offerings()
                }
            )

        return qs.order_by("-created_at")

    def audit(self, obj, action):
        Audit.objects.create(
            institute=self.scope.institute,
            actor=self.request.user,
            action=f"{self.model.__name__}.{action}",
            object_id=str(obj.pk),
        )

    @transaction.atomic
    def perform_create(self, serializer):
        self.scope.require(*self.write_roles)

        obj = serializer.save(
            institute=self.scope.institute
        )

        self.audit(obj, "create")

    @transaction.atomic
    def perform_update(self, serializer):
        self.scope.require(*self.write_roles)

        # Relationships remain immutable after creation.
        # This prevents moving protected academic records.

        for field in self.model._meta.fields:
            if (
                field.is_relation
                and field.name in serializer.validated_data
            ):
                if getattr(
                    serializer.instance,
                    field.attname,
                ) != getattr(
                    serializer.validated_data[field.name],
                    "pk",
                    None,
                ):
                    raise ValidationError(
                        {
                            field.name: (
                                "Relationship cannot be changed. "
                                "Create a new record instead."
                            )
                        }
                    )

        obj = serializer.save()
        self.audit(obj, "update")

    @transaction.atomic
    def perform_destroy(self, instance):
        self.scope.require(*self.write_roles)

        if self.model == Enrollment:
            raise ValidationError(
                "Withdraw the enrollment instead of deleting "
                "academic history."
            )

        if self.model == Offering:
            raise ValidationError(
                "Archive the course offering to preserve "
                "its academic history."
            )

        if getattr(instance, "published", False):
            raise ValidationError(
                "Only unpublished drafts can be deleted."
            )

        # Prevent CASCADE from deleting academic history.

        for relation in instance._meta.related_objects:
            if (
                relation.on_delete.__name__ == "CASCADE"
                and not relation.many_to_many
            ):
                manager = getattr(
                    instance,
                    relation.get_accessor_name(),
                    None,
                )

                if (
                    manager is not None
                    and hasattr(manager, "exists")
                    and manager.exists()
                ):
                    raise ValidationError(
                        "Related academic history exists. "
                        "Preserve or archive this record instead."
                    )

        self.audit(instance, "delete")

        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(
                "This record is referenced by academic records; "
                "archive or deactivate it instead."
            )


class StructureViewSet(TenantViewSet):

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset().select_related(
            *[
                field.name
                for field in self.model._meta.fields
                if field.is_relation
            ]
        )

        scope = self.scope

        if scope.role in ["admin", "superadmin"]:
            return qs

        if scope.role == "head":
            if self.model in [Course, Program]:
                return qs.filter(
                    unit_id=scope.membership.unit_id
                )

            if self.model in [
                Section,
                AdmissionBatch,
                CurriculumItem,
            ]:
                return qs.filter(
                    program__unit_id=scope.membership.unit_id
                )

        if self.model == Unit:
            ids = scope.offerings().values_list(
                "course__unit_id",
                flat=True,
            )

            return (
                qs.filter(pk__in=ids)
                if scope.role != "head"
                else qs.filter(
                    pk=scope.membership.unit_id
                )
            )

        if self.model == Course:
            return qs.filter(
                pk__in=scope.offerings().values("course_id")
            )

        if self.model == Program:
            return qs.filter(
                pk__in=scope.offerings().values(
                    "section__program_id"
                )
            )

        if self.model == Section:
            return qs.filter(
                pk__in=scope.offerings().values("section_id")
            )

        if self.model in [
            AdmissionBatch,
            CurriculumItem,
        ]:
            return qs.filter(
                program_id__in=scope.offerings().values(
                    "section__program_id"
                )
            )

        return qs


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
                        self.scope.role == "admin"
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

    filterset_fields = [
        "offering",
        "student",
        "active",
    ]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset()

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


class TimetableViewSet(TenantViewSet):
    model = Timetable

    offering_path = "offering"

    filterset_fields = [
        "offering",
        "day",
    ]


STRUCTURES = {
    "batches": AdmissionBatch,
    "curriculum": CurriculumItem,
    "units": Unit,
    "years": Year,
    "terms": Term,
    "programs": Program,
    "sections": Section,
    "courses": Course,
}