"""A scoped learner drilldown; unreleased marks and feedback never leave this API."""
from django.db.models import Exists, OuterRef
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view
from drf_spectacular.utils import extend_schema
from apps.accounts.scope import Scope
from apps.learning.models import Assignment, Submission
from .filters import ReportPagination, enrollment_queryset
from .gradebook import gradebook
from .report_contracts import GradeRow


class LearnerProgressQuery(serializers.Serializer):
    offering = serializers.UUIDField()
    student = serializers.UUIDField()
    missing_only = serializers.BooleanField(required=False, default=False)
    page = serializers.IntegerField(required=False, min_value=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100)


class AssignmentProgressRow(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()
    due_at = serializers.DateTimeField()
    status = serializers.ChoiceField(choices=["missing", "pending", "submitted", "released"])
    max_marks = serializers.IntegerField()
    marks = serializers.DecimalField(max_digits=7, decimal_places=2, allow_null=True)
    feedback = serializers.CharField(allow_blank=True)


class LearnerProgressResult(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = AssignmentProgressRow(many=True)
    summary = GradeRow()


@extend_schema(parameters=[LearnerProgressQuery], responses=LearnerProgressResult)
@api_view(["GET"])
def learner_progress(request):
    scope = Scope(request)
    query = LearnerProgressQuery(data=request.query_params.dict())
    query.is_valid(raise_exception=True)
    values = query.validated_data
    # Scope before lookup: guessing a student/course pair cannot reveal existence.
    enrollment = get_object_or_404(enrollment_queryset(scope, values))
    now = timezone.now()
    assignments = Assignment.objects.filter(institute=scope.institute, offering=enrollment.offering, published=True).annotate(
        submitted=Exists(Submission.objects.filter(institute=scope.institute, assignment_id=OuterRef("pk"), student_id=enrollment.student_id))
    ).order_by("due_at", "pk")
    if values["missing_only"]:
        assignments = assignments.filter(submitted=False, due_at__lt=now)
    paginator = ReportPagination()
    page = paginator.paginate_queryset(assignments, request)
    submissions = {row.assignment_id: row for row in Submission.objects.filter(institute=scope.institute, assignment__in=page, student_id=enrollment.student_id)}
    rows = []
    for assignment in page:
        submission = submissions.get(assignment.pk)
        released = bool(submission and submission.released)
        rows.append(dict(id=assignment.pk, title=assignment.title, due_at=assignment.due_at,
            status="released" if released else "submitted" if submission else "missing" if assignment.due_at < now else "pending",
            max_marks=assignment.max_marks,
            marks=submission.marks if released else None, feedback=submission.feedback if released else ""))
    response = paginator.get_paginated_response(AssignmentProgressRow(rows, many=True).data)
    response.data["summary"] = gradebook(scope, [enrollment])[0]
    return response
