"""Insights audit API; extracted without changing behavior."""
from apps.academics.views import TenantViewSet
from ..models import Audit


class AuditViewSet(TenantViewSet):
    model = Audit

    http_method_names = [
        "get",
        "head",
        "options",
    ]

    def get_queryset(self):
        if getattr(
            self,
            "swagger_fake_view",
            False,
        ):
            return self.model.objects.none()

        self.scope.require("admin")

        return super().get_queryset()
