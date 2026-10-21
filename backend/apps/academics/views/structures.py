"""Academics structures API; extracted without changing behavior."""
from ..models import AdmissionBatch, CurriculumItem, Unit, Year, Term, Program, Section, Course
from .base import TenantViewSet


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
