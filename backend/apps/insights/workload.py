from django.db.models import Count, Q
from rest_framework import generics, serializers
from drf_spectacular.utils import extend_schema
from apps.accounts.models import User
from apps.accounts.scope import Scope
from .filters import ReportPagination


class WorkloadQuery(serializers.Serializer):
    search = serializers.CharField(required=False, allow_blank=True, max_length=120)
    term = serializers.UUIDField(required=False)
    unit = serializers.UUIDField(required=False)
    archived = serializers.BooleanField(required=False)
    page = serializers.IntegerField(required=False, min_value=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100)


def workload_queryset(scope, values=None):
    values = values or {}
    offerings = scope.offerings()
    for key, field in [
        ("offering", "pk"),
        ("term", "term_id"),
        ("unit", "course__unit_id"),
        ("archived", "archived"),
    ]:
        if key in values:
            offerings = offerings.filter(**{field: values[key]})
    teachers = (
        User.objects.filter(teaching__in=offerings)
        .annotate(
            courses=Count("teaching", filter=Q(teaching__in=offerings), distinct=True),
            learners=Count(
                "teaching__enrollments__student",
                filter=Q(teaching__in=offerings, teaching__enrollments__active=True),
                distinct=True,
            ),
        )
        .order_by("username", "pk")
    )
    if scope.role == "teacher":
        teachers = teachers.filter(pk=scope.user.pk)
    if values.get("search"):
        search = values["search"]
        teachers = teachers.filter(
            Q(username__icontains=search)
            | Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
        )
    return teachers


class WorkloadSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    teacher = serializers.SerializerMethodField()
    courses = serializers.IntegerField(read_only=True)
    learners = serializers.IntegerField(read_only=True)

    def get_teacher(self, obj) -> str:
        return obj.get_full_name() or obj.username


@extend_schema(parameters=[WorkloadQuery])
class WorkloadView(generics.ListAPIView):
    serializer_class = WorkloadSerializer
    pagination_class = ReportPagination
    filter_backends = []

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return User.objects.none()
        scope = Scope(self.request)
        scope.require("admin", "head", "teacher")
        query = WorkloadQuery(data=self.request.query_params.dict())
        query.is_valid(raise_exception=True)
        return workload_queryset(scope, query.validated_data)
