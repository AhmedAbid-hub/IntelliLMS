"""Learning notifications API; extracted without changing behavior."""
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from apps.academics.views import TenantViewSet
from ..contracts import ReadResult
from ..models import Notification


class NotificationViewSet(TenantViewSet):
    model = Notification

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        return super().get_queryset().filter(
            user=self.request.user
        )

    def create(self, request):
        raise PermissionDenied(
            "Notifications cannot be created directly."
        )

    @extend_schema(
        request=None,
        responses=ReadResult,
    )
    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        obj = self.get_object()

        if not obj.read:
            obj.read = True
            obj.save(update_fields=["read"])

        return Response({
            "read": True,
        })
