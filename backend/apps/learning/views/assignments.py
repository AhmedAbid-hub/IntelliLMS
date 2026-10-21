"""Learning assignments API; extracted without changing behavior."""
from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from apps.academics.models import Enrollment
from apps.academics.views import TenantViewSet
from apps.academics.serializers import serializer_for
from apps.insights.models import Activity, Audit
from ..contracts import SubmissionGradeInput, AssignmentSubmitInput, GradeHistoryEvent, payload
from ..models import Assignment, Submission
from ..serializers import LearningSerializer, validate_upload
from ..history import grade_history
from ..governance import require_unfinalized
from ..notifications import notify_event as notify
from .base import LearningViewSet, marks_value, require_assigned_instructor


class AssignmentViewSet(LearningViewSet):
    model = Assignment

    # Institute Admin is read-only for assignments.
    # Only assigned instructors may manage assignments.
    write_roles = ("head", "teacher")

    filterset_fields = {
        "offering": ["exact"],
        "published": ["exact"],
        "due_at": ["gte", "lte"],
    }

    ordering_fields = ["created_at", "due_at"]

    def require_instructor(self, offering):
        require_assigned_instructor(
            self.scope,
            self.request.user,
            offering,
        )

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
                "This assignment has no supporting resource."
            )

        return FileResponse(
            obj.file.open("rb"),
            as_attachment=True,
            filename=obj.file.name.split("/")[-1],
            content_type="application/octet-stream",
        )

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset()

        if self.scope.role == "student":
            return qs.filter(published=True)

        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        self.require_instructor(
            serializer.validated_data["offering"]
        )

        super().perform_create(serializer)

        if serializer.instance.published:
            self.announce(serializer.instance)

    @transaction.atomic
    def perform_update(self, serializer):
        self.require_instructor(
            serializer.instance.offering
        )

        if "offering" in serializer.validated_data:
            self.require_instructor(
                serializer.validated_data["offering"]
            )

        serializer.instance = get_object_or_404(
            Assignment.objects.select_for_update(),
            pk=serializer.instance.pk,
            institute=self.scope.institute,
        )

        serializer.validate(serializer.validated_data)

        was_published = serializer.instance.published

        super().perform_update(serializer)

        if serializer.instance.published and not was_published:
            self.announce(serializer.instance)

    def perform_destroy(self, instance):
        self.require_instructor(instance.offering)
        super().perform_destroy(instance)

    def announce(self, obj):
        notify(
            obj.institute,
            Enrollment.objects.filter(
                institute=obj.institute,
                offering=obj.offering,
                active=True,
            ).values_list("student_id", flat=True),
            "New assignment: " + obj.title,
            event_key=f"assignment:{obj.pk}",
            destination=f"/assignments?offering={obj.offering_id}",
        )

    @extend_schema(
        request=AssignmentSubmitInput,
        responses={
            201: serializer_for(
                Submission,
                LearningSerializer,
            )
        },
    )
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def submit(self, request, pk=None):
        self.scope.require("student")

        assignment = self.get_object()

        assignment = get_object_or_404(
            Assignment.objects.select_for_update(),
            pk=assignment.pk,
            institute=self.scope.institute,
        )

        if not assignment.published:
            raise ValidationError(
                "This assignment is no longer published."
            )

        self.scope.check_offering(
            assignment.offering,
            write=True,
        )

        late = timezone.now() > assignment.due_at

        if late and not assignment.allow_late:
            raise ValidationError(
                "The submission deadline has passed."
            )

        existing = (
            Submission.objects.select_for_update()
            .filter(
                institute=self.scope.institute,
                assignment=assignment,
                student=request.user,
            )
            .first()
        )

        if existing and (
            not assignment.allow_resubmit
            or existing.marks is not None
        ):
            raise ValidationError(
                "Resubmission is not permitted."
            )

        values = payload(
            AssignmentSubmitInput,
            request.data,
        )

        text = values["text"]
        file = values.get("file")

        if not isinstance(text, str) or len(text) > 100000:
            raise ValidationError(
                "Answer must be text up to 100,000 characters."
            )

        if not text.strip() and not file:
            raise ValidationError(
                "Enter an answer or attach a file."
            )

        if file:
            validate_upload(file)

        obj = existing or Submission(
            institute=self.scope.institute,
            assignment=assignment,
            student=request.user,
        )

        obj.text = text
        obj.late = late
        obj.submitted_at = timezone.now()

        if file:
            obj.file = file

        obj.save()

        notify(
            obj.institute,
            assignment.offering.teachers.values_list(
                "pk",
                flat=True,
            ),
            "Assignment submitted: " + assignment.title,
            event_key=(
                f"submission:{obj.pk}:"
                f"{obj.submitted_at.isoformat()}"
            ),
            destination=f"/submissions?assignment={assignment.pk}",
        )

        Activity.objects.create(
            institute=self.scope.institute,
            user=request.user,
            offering=assignment.offering,
            kind="assignment_submit",
        )

        return Response(
            serializer_for(
                Submission,
                LearningSerializer,
            )(
                obj,
                context={"request": request},
            ).data,
            status=201,
        )


class SubmissionViewSet(TenantViewSet):
    model = Submission
    offering_path = "assignment__offering"

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    filterset_fields = ["assignment", "student"]

    @extend_schema(
        responses=GradeHistoryEvent(many=True)
    )
    @action(
        detail=True,
        methods=["get"],
        url_path="grade-history",
    )
    def history(self, request, pk=None):
        return grade_history(
            self,
            self.get_object(),
        )

    def get_serializer_class(self):
        return serializer_for(
            Submission,
            LearningSerializer,
        )

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset()

        if self.scope.role == "student":
            return qs.filter(student=self.request.user)

        return qs

    def create(self, request):
        raise ValidationError(
            "Submit through the assignment submit action."
        )

    @extend_schema(
        request=SubmissionGradeInput,
        responses=serializer_for(
            Submission,
            LearningSerializer,
        ),
    )
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def grade(self, request, pk=None):
        self.scope.require("head", "teacher")

        scoped = self.get_object()

        obj = get_object_or_404(
            Submission.objects.select_for_update(),
            pk=scoped.pk,
            institute=self.scope.institute,
        )

        offering = obj.assignment.offering

        require_assigned_instructor(
            self.scope,
            request.user,
            offering,
        )

        require_unfinalized(obj)

        old = str(obj.marks)

        values = payload(
            SubmissionGradeInput,
            request.data,
        )

        obj.marks = marks_value(
            values["marks"],
            obj.assignment.max_marks,
        )

        obj.feedback = values["feedback"]
        obj.released = values["released"]
        obj.save()

        Audit.objects.create(
            institute=self.scope.institute,
            actor=request.user,
            action="Submission.grade",
            object_id=str(obj.id),
            detail={
                "previous_marks": old,
                "marks": str(obj.marks),
                "released": obj.released,
            },
        )

        if obj.released:
            notify(
                obj.institute,
                [obj.student_id],
                "Grade released: " + obj.assignment.title,
                event_key=(
                    f"submission-grade:{obj.pk}:"
                    f"{obj.marks}:{obj.released}"
                ),
                destination="/grades",
            )

        return Response(
            self.get_serializer(obj).data
        )

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
                "This submission has no file."
            )

        return FileResponse(
            obj.file.open("rb"),
            as_attachment=True,
            filename=obj.file.name.split("/")[-1],
            content_type="application/octet-stream",
        )
