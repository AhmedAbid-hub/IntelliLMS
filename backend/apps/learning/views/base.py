"""Learning base API; extracted without changing behavior."""
from decimal import Decimal, InvalidOperation
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.academics.views import TenantViewSet
from apps.academics.serializers import serializer_for
from ..models import Announcement
from ..serializers import LearningSerializer
from ..governance import assigned_instructor, require_unfinalized


class LearningViewSet(TenantViewSet):
    offering_path = "offering"
    write_roles = ("admin", "head", "teacher")
    filterset_fields = ["offering"]
    search_fields = ["title"]

    def require_teaching_write(self, values):
        if self.model == Announcement:
            return  # Scoped department/institute announcements are management work.
        related = values
        for part in self.offering_path.split("__"):
            related = related.get(part) if isinstance(related, dict) else getattr(related, part)
        require_assigned_instructor(self.scope, self.request.user, related)

    def perform_create(self, serializer):
        self.require_teaching_write(serializer.validated_data)
        super().perform_create(serializer)

    def perform_update(self, serializer):
        self.require_teaching_write(serializer.instance)
        super().perform_update(serializer)

    def get_serializer_class(self):
        return serializer_for(self.model, LearningSerializer)

    def perform_destroy(self, instance):
        self.require_teaching_write(instance)
        if getattr(instance, "finalized", False):
            require_unfinalized(instance)

        if self.offering_path:
            offering = instance

            for part in self.offering_path.split("__"):
                offering = getattr(offering, part)

            self.scope.check_offering(offering, write=True)

        super().perform_destroy(instance)


def require_assigned_instructor(scope, user, offering):
    scope.require("head", "teacher")
    scope.check_offering(offering, write=True)

    if not assigned_instructor(scope, offering):
        raise PermissionDenied(
            "Only assigned instructors can manage this assessment."
        )


def marks_value(value, maximum):
    try:
        result = Decimal(str(value))
        maximum = Decimal(str(maximum))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError("Marks must be a number.")

    if (
        not result.is_finite()
        or not maximum.is_finite()
        or result < 0
        or result > maximum
    ):
        raise ValidationError(
            f"Marks must be between 0 and {maximum}."
        )

    return result.quantize(Decimal(".01"))
