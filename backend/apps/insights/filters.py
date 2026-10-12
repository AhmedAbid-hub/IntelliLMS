from django.db.models import Q
from rest_framework import serializers
from rest_framework.pagination import PageNumberPagination
from apps.academics.models import Enrollment


class ReportQuery(serializers.Serializer):
    offering = serializers.UUIDField(required=False)
    term = serializers.UUIDField(required=False)
    unit = serializers.UUIDField(required=False)
    student = serializers.UUIDField(required=False)
    search = serializers.CharField(required=False, allow_blank=True, max_length=120)
    archived = serializers.BooleanField(required=False)
    page = serializers.IntegerField(required=False, min_value=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100)


def query_values(request):
    # QueryDict triggers HTML-checkbox behavior: an omitted BooleanField becomes
    # False. In a filter API, omission means include both active and archived.
    query = ReportQuery(data=request.query_params.dict())
    query.is_valid(raise_exception=True)
    return query.validated_data


def enrollment_queryset(scope, values=None):
    values = values or {}
    qs = Enrollment.objects.filter(
        institute=scope.institute, offering__in=scope.offerings(), active=True
    )
    if scope.role == "student":
        qs = qs.filter(student=scope.user)
    for parameter, field in [
        ("offering", "offering_id"),
        ("term", "offering__term_id"),
        ("unit", "offering__course__unit_id"),
        ("student", "student_id"),
        ("archived", "offering__archived"),
    ]:
        if parameter in values:
            qs = qs.filter(**{field: values[parameter]})
    if values.get("search"):
        term = values["search"]
        qs = qs.filter(
            Q(student__username__icontains=term)
            | Q(student__first_name__icontains=term)
            | Q(student__last_name__icontains=term)
            | Q(offering__title__icontains=term)
        )
    return qs.select_related("student", "offering", "offering__course__unit").order_by(
        "offering__title", "student__username", "pk"
    )


class ReportPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
