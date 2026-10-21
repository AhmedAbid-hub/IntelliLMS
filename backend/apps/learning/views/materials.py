"""Learning materials API; extracted without changing behavior."""
from django.db.models import Q
from django.http import FileResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from ..models import Material
from .base import LearningViewSet


class MaterialViewSet(LearningViewSet):
    model = Material

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset()

        if self.scope.role == "student":
            qs = qs.filter(
                lesson__published=True
            ).filter(
                Q(lesson__visible_at__isnull=True)
                | Q(lesson__visible_at__lte=timezone.now())
            )

        return qs

    @extend_schema(
        responses={
            (200, "application/octet-stream"): OpenApiTypes.BINARY
        }
    )
    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        obj = self.get_object()

        if not obj.file:
            raise ValidationError(
                "This material has no downloadable file."
            )

        return FileResponse(
            obj.file.open("rb"),
            as_attachment=True,
            filename=obj.file.name.split("/")[-1],
            content_type="application/octet-stream",
        )
