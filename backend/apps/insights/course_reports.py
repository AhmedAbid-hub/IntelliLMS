"""Paginated course comparisons computed in SQL, without learner-row hydration."""
from django.db.models import Avg, Count, ExpressionWrapper, F, FloatField, OuterRef, Q, Subquery
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema
from apps.accounts.scope import Scope
from apps.academics.models import Enrollment, Offering
from apps.learning.models import Assignment, Attendance, Submission
from .filters import AcademicFilters, ReportPagination, offering_queryset, filter_study_stage


class CourseComparisonQuery(AcademicFilters):
    search = serializers.CharField(required=False, allow_blank=True, max_length=120)
    ordering = serializers.ChoiceField(required=False, choices=["title", "-title", "-learners", "learners"])
    page = serializers.IntegerField(required=False, min_value=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100)


class CourseComparisonSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    department = serializers.CharField(source="course.unit.name", default="Unassigned")
    term = serializers.CharField(source="term.name")
    section = serializers.CharField(source="section.name", allow_null=True, default=None)
    learners = serializers.IntegerField()
    instructors = serializers.IntegerField()
    due_assignments = serializers.IntegerField()
    submitted_due = serializers.IntegerField()
    missing_submissions = serializers.SerializerMethodField()
    released_grades = serializers.IntegerField()
    below_pass_mark = serializers.IntegerField()
    meeting_pass_mark = serializers.SerializerMethodField()
    assignment_average = serializers.FloatField(allow_null=True)
    attendance_records = serializers.IntegerField()
    attendance_percentage = serializers.SerializerMethodField()

    def get_missing_submissions(self, obj) -> int:
        return max(0, obj.due_assignments * obj.learners - obj.submitted_due)

    def get_meeting_pass_mark(self, obj) -> int:
        return obj.released_grades - obj.below_pass_mark

    def get_attendance_percentage(self, obj) -> float | None:
        return round(obj.present_records / obj.attendance_records * 100, 2) if obj.attendance_records else None


def course_comparisons(scope, values):
    offerings = offering_queryset(scope, values).select_related("course__unit", "term", "section")
    if values.get("search"):
        text = values["search"]
        offerings = offerings.filter(
            Q(title__icontains=text) | Q(course__code__icontains=text)
            | (Q(enrollments__active=True) & (
                Q(enrollments__student__username__icontains=text)
                | Q(enrollments__student__first_name__icontains=text)
                | Q(enrollments__student__last_name__icontains=text)))
        ).distinct()
    # Each subquery is grouped by course: no multiplying joins between students,
    # teachers, marks and attendance, and no Python list of individual learners.
    enrolled = filter_study_stage(Enrollment.objects.filter(institute=scope.institute, offering_id=OuterRef("pk"), active=True), values)
    active_pair = filter_study_stage(Enrollment.objects.filter(institute=scope.institute, offering_id=OuterRef("assignment__offering_id"), active=True), values).values("student_id")
    submissions = Submission.objects.filter(institute=scope.institute, assignment__offering_id=OuterRef("pk"), student_id__in=Subquery(active_pair))
    due = Assignment.objects.filter(institute=scope.institute, offering_id=OuterRef("pk"), published=True, due_at__lt=timezone.now())
    submitted_due = submissions.filter(assignment__published=True, assignment__due_at__lt=timezone.now())
    percentage = ExpressionWrapper(F("marks") * 100.0 / F("assignment__max_marks"), output_field=FloatField())
    graded = submissions.filter(released=True, marks__isnull=False).annotate(percentage=percentage)
    attendance_pair = filter_study_stage(Enrollment.objects.filter(institute=scope.institute, offering_id=OuterRef("session__offering_id"), active=True), values).values("student_id")
    attendance = Attendance.objects.filter(institute=scope.institute, session__offering_id=OuterRef("pk"), student_id__in=Subquery(attendance_pair)).exclude(status="excused")
    teachers = Offering.teachers.through.objects.filter(offering_id=OuterRef("pk"))

    def total(qs, group):
        return Coalesce(Subquery(qs.order_by().values(group).annotate(total=Count("pk")).values("total")), 0)

    return offerings.annotate(
        learners=total(enrolled, "offering_id"),
        instructors=total(teachers, "offering_id"),
        due_assignments=total(due, "offering_id"),
        submitted_due=total(submitted_due, "assignment__offering_id"),
        released_grades=total(graded, "assignment__offering_id"),
        below_pass_mark=total(graded.filter(percentage__lt=scope.institute.grading_rules.get("pass_mark", 50)), "assignment__offering_id"),
        assignment_average=Subquery(graded.order_by().values("assignment__offering_id").annotate(mean=Avg("percentage")).values("mean")),
        attendance_records=total(attendance, "session__offering_id"),
        present_records=total(attendance.filter(status__in=["present", "late"]), "session__offering_id"),
    ).order_by(values.get("ordering", "title"), "pk")


@extend_schema(parameters=[CourseComparisonQuery])
class CourseComparisonView(generics.ListAPIView):
    serializer_class = CourseComparisonSerializer
    pagination_class = ReportPagination
    filter_backends = []

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Offering.objects.none()
        scope = Scope(self.request)
        if scope.role not in ("admin", "head", "teacher"):
            raise PermissionDenied("Course comparisons require academic staff access.")
        query = CourseComparisonQuery(data=self.request.query_params.dict())
        query.is_valid(raise_exception=True)
        return course_comparisons(scope, query.validated_data)
