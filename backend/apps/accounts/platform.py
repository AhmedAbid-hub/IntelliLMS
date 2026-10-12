from rest_framework import mixins, permissions, serializers, viewsets
from rest_framework.exceptions import ValidationError
from .models import User, Institute, Membership
from django.contrib.admin.models import LogEntry, CHANGE
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import PlatformConfiguration


class PlatformConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformConfiguration
        fields = ["platform_name", "support_email", "login_notice", "updated_at"]
        read_only_fields = ["updated_at"]


from drf_spectacular.utils import extend_schema


@extend_schema(
    request=PlatformConfigurationSerializer, responses=PlatformConfigurationSerializer
)
@api_view(["GET", "PATCH"])
@permission_classes([permissions.AllowAny])
def platform_settings(request):
    if request.method == "GET":
        # Only explicitly public branding fields are serialized. Reading creates no row.
        obj = PlatformConfiguration.objects.first() or PlatformConfiguration()
        return Response(PlatformConfigurationSerializer(obj).data)
    if not request.user.is_authenticated or not request.user.is_superuser:
        raise PermissionDenied("Platform administrator access is required.")
    with transaction.atomic():
        obj, _ = PlatformConfiguration.objects.get_or_create(pk=1)
        obj = PlatformConfiguration.objects.select_for_update().get(pk=obj.pk)
        serializer = PlatformConfigurationSerializer(
            obj, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        LogEntry.objects.create(
            user=request.user,
            content_type=ContentType.objects.get_for_model(PlatformConfiguration),
            object_id="1",
            object_repr="Platform configuration",
            action_flag=CHANGE,
            change_message="Updated fields: " + ", ".join(serializer.validated_data),
        )
    return Response(serializer.data)


class PlatformAdministrator(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.is_superuser
        )


class PlatformAuditSerializer(serializers.ModelSerializer):
    actor = serializers.CharField(source="user.username", read_only=True)
    action = serializers.CharField(source="get_action_flag_display", read_only=True)
    model = serializers.CharField(
        source="content_type.model", read_only=True, allow_null=True
    )

    class Meta:
        model = LogEntry
        fields = [
            "id",
            "action_time",
            "actor",
            "action",
            "model",
            "object_repr",
            "change_message",
        ]


class PlatformAuditViewSet(viewsets.ReadOnlyModelViewSet):
    """Global platform events: deliberately independent of the active tenant.

    Institute audit events remain in the tenant-scoped audit endpoint.
    """

    permission_classes = [PlatformAdministrator]
    serializer_class = PlatformAuditSerializer
    queryset = LogEntry.objects.select_related("user", "content_type").order_by(
        "-action_time", "-pk"
    )
    search_fields = ["user__username", "object_repr", "change_message"]
    filterset_fields = ["action_flag", "content_type__model"]


class PlatformUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_superuser",
        ]
        read_only_fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_superuser",
        ]

    def validate_is_active(self, value):
        if not value and (
            self.instance.pk == self.context["request"].user.pk
            or self.instance.is_superuser
        ):
            raise ValidationError(
                "Platform administrator accounts cannot be disabled here."
            )
        return value


class PlatformUserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [PlatformAdministrator]
    serializer_class = PlatformUserSerializer
    queryset = User.objects.filter(Q(is_superuser=True) | Q(membership__role="admin")).distinct().order_by("username")
    http_method_names = ["get", "patch", "head", "options"]
    search_fields = ["username", "email", "first_name", "last_name"]
    filterset_fields = ["is_active"]

    @transaction.atomic
    def perform_update(self, serializer):
        if serializer.validated_data.get("is_active") is False:
            # Use the same institute locks as membership lifecycle operations.
            # Global deactivation must not bypass last-administrator protection.
            members = list(Membership.objects.filter(user=serializer.instance, role="admin", active=True))
            list(Institute.objects.select_for_update().filter(pk__in=[member.institute_id for member in members]).order_by("pk"))
            from .lifecycle import check_last_admin
            for member in members:
                check_last_admin(member, member.role, False)
        obj = serializer.save()
        LogEntry.objects.create(
            user=self.request.user,
            content_type=ContentType.objects.get_for_model(User),
            object_id=str(obj.pk),
            object_repr=obj.username,
            action_flag=CHANGE,
            change_message=f"Account active status set to {obj.is_active} through platform directory.",
        )
