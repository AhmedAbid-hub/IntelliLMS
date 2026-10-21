"""Academics base API; extracted without changing behavior."""
from contextlib import contextmanager
from django.db import transaction
from django.db.models.deletion import ProtectedError
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.accounts.scope import Scope
from apps.accounts.models import Institute
from apps.insights.models import Audit
from ..models import AdmissionBatch, CurriculumItem, Unit, Year, Term, Program, Section, Course, Offering, Enrollment, Timetable
from ..serializers import serializer_for


class TenantViewSet(viewsets.ModelViewSet):
    model = None
    write_roles = ("admin",)
    offering_path = None
    ordering_fields = ["created_at"]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.scope.institute and self.scope.institute.kind == "school" and self.model in (Unit, AdmissionBatch):
            raise PermissionDenied("Schools use classes and sections, without departments or admission batches.")

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

        if self.model.__name__ != "AttendanceSession" and self.model not in (
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
