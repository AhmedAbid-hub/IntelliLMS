from django.db.models import Q, Exists, OuterRef
from rest_framework import serializers
from rest_framework.pagination import PageNumberPagination
from apps.academics.models import Enrollment, StudentPlacement


class AcademicFilters(serializers.Serializer):
    offering = serializers.UUIDField(required=False)
    term = serializers.UUIDField(required=False)
    unit = serializers.UUIDField(required=False)
    program = serializers.UUIDField(required=False)
    year = serializers.UUIDField(required=False)
    section = serializers.UUIDField(required=False)
    batch = serializers.UUIDField(required=False)
    course = serializers.UUIDField(required=False)
    stage = serializers.IntegerField(required=False, min_value=1, max_value=40)
    archived = serializers.BooleanField(required=False)


OFFERING_FILTERS = {
    "offering": "pk", "term": "term_id", "unit": "course__unit_id",
    "program": "section__program_id", "year": "term__year_id",
    "section": "section_id", "batch": "section__batch_id", "archived": "archived", "course": "course_id",
}


def filter_study_stage(enrollments, values):
    if "stage" not in (values or {}):
        return enrollments
    placements = StudentPlacement.objects.filter(institute_id=OuterRef("institute_id"), membership__user_id=OuterRef("student_id"), stage=values["stage"]).filter(
        Q(term_id=OuterRef("offering__term_id")) | Q(term__isnull=True, year_id=OuterRef("offering__term__year_id")))
    if values.get("program"):
        placements = placements.filter(program_id=values["program"])
    else:
        placements = placements.filter(Q(program_id=OuterRef("offering__section__program_id")) | Q(section__isnull=True))
    return enrollments.filter(Exists(placements))


def restrict_report_pairs(records, enrollments, student="student_id", offering="offering_id"):
    return records.filter(Exists(enrollments.filter(student_id=OuterRef(student), offering_id=OuterRef(offering))))


def offering_queryset(scope, values=None):
    qs = scope.offerings()
    for parameter, field in OFFERING_FILTERS.items():
        if parameter in (values or {}):
            qs = qs.filter(**{field: values[parameter]})
    if "stage" in (values or {}):
        students = filter_study_stage(Enrollment.objects.filter(institute=scope.institute, active=True), values)
        if scope.role == "student":
            students = students.filter(student=scope.user)
        qs = qs.filter(pk__in=students.values("offering_id"))
    return qs


class ReportQuery(AcademicFilters):
    student = serializers.UUIDField(required=False)
    search = serializers.CharField(required=False, allow_blank=True, max_length=120)
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
        institute=scope.institute, offering__in=offering_queryset(scope, values), active=True
    )
    qs = filter_study_stage(qs, values)
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
