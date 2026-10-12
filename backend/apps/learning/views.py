from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q, Max
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes

from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response

from apps.accounts.models import Membership, User
from apps.academics.models import Enrollment
from apps.academics.views import TenantViewSet
from apps.academics.serializers import serializer_for
from apps.insights.models import Activity, Audit

from .contracts import (
    SubmissionGradeInput,
    AssignmentSubmitInput,
    AnswersInput,
    AttemptGradeInput,
    AttendanceInput,
    AttendanceResult,
    BankCopyInput,
    AttemptResult,
    CompletionResult,
    ReadResult,
    GradeHistoryEvent,
    payload,
)

from .models import (
    Module,
    Lesson,
    Completion,
    Material,
    Assignment,
    Submission,
    Quiz,
    Question,
    Attempt,
    AttendanceSession,
    Attendance,
    Announcement,
    Notification,
    ManualGrade,
    BankQuestion,
)

from .serializers import LearningSerializer, validate_upload
from .history import grade_history
from .governance import require_unfinalized
from .authoring import QuizAuthoringActions
from .roster import (
    AttendanceHistorySerializer,
    RosterQuery,
    RosterRow,
    roster_response,
)
from .notifications import notify_event as notify


def marks_value(value, maximum):
    try:
        result = Decimal(str(value))
        maximum = Decimal(str(maximum))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError("Marks must be a number.")

    if (
        not result.is_finite()
        or not maximum.is_finite()
        or result < 0
        or result > maximum
    ):
        raise ValidationError(
            f"Marks must be between 0 and {maximum}."
        )

    return result.quantize(Decimal(".01"))


def require_assigned_instructor(scope, user, offering):
    scope.require("head", "teacher")
    scope.check_offering(offering, write=True)

    if not offering.teachers.filter(pk=user.pk).exists():
        raise PermissionDenied(
            "Only assigned instructors can manage this assessment."
        )


class LearningViewSet(TenantViewSet):
    offering_path = "offering"
    write_roles = ("admin", "head", "teacher")
    filterset_fields = ["offering"]
    search_fields = ["title"]

    def get_serializer_class(self):
        return serializer_for(self.model, LearningSerializer)

    def perform_destroy(self, instance):
        if getattr(instance, "finalized", False):
            require_unfinalized(instance)

        if self.offering_path:
            offering = instance

            for part in self.offering_path.split("__"):
                offering = getattr(offering, part)

            self.scope.check_offering(offering, write=True)

        super().perform_destroy(instance)


class ModuleViewSet(LearningViewSet):
    model = Module

    def get_queryset(self):
        return super().get_queryset().order_by(
            "position", "created_at", "pk"
        )


class LessonViewSet(LearningViewSet):
    model = Lesson

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset()

        if self.scope.role == "student":
            qs = qs.filter(published=True).filter(
                Q(visible_at__isnull=True)
                | Q(visible_at__lte=timezone.now())
            )

        return qs.order_by("position", "created_at", "pk")

    @extend_schema(request=None, responses=CompletionResult)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def complete(self, request, pk=None):
        self.scope.require("student")

        lesson = self.get_object()

        self.scope.check_offering(
            lesson.offering,
            write=True,
        )

        obj, created = Completion.objects.get_or_create(
            institute=self.scope.institute,
            lesson=lesson,
            student=request.user,
        )

        if created:
            Activity.objects.create(
                institute=self.scope.institute,
                user=request.user,
                offering=lesson.offering,
                kind="lesson_complete",
            )

        return Response({
            "completed": True,
            "created_at": obj.created_at,
        })


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


class QuizViewSet(QuizAuthoringActions, LearningViewSet):
    model = Quiz

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.instance = get_object_or_404(
            Quiz.objects.select_for_update(),
            pk=serializer.instance.pk,
            institute=self.scope.institute,
        )

        serializer.validate(serializer.validated_data)

        was_released = serializer.instance.released

        super().perform_update(serializer)

        quiz = serializer.instance

        if quiz.released and not was_released:
            notify(
                quiz.institute,
                quiz.attempt_set.filter(
                    submitted_at__isnull=False,
                    marks__isnull=False,
                ).values_list("student_id", flat=True),
                "Quiz results released: " + quiz.title,
                event_key=f"quiz-release:{quiz.pk}",
                destination=f"/attempts?quiz={quiz.pk}",
            )

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset()

        if self.scope.role == "student":
            return qs.filter(published=True)

        return qs

    @extend_schema(
        request=None,
        responses={
            200: AttemptResult,
            201: AttemptResult,
        },
    )
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def start(self, request, pk=None):
        self.scope.require("student")

        scoped = self.get_object()

        quiz = get_object_or_404(
            Quiz.objects.select_for_update(),
            pk=scoped.pk,
            institute=self.scope.institute,
        )

        if not quiz.published:
            raise ValidationError(
                "This quiz is no longer published."
            )

        self.scope.check_offering(
            quiz.offering,
            write=True,
        )

        now = timezone.now()

        if not quiz.opens_at <= now < quiz.closes_at:
            raise ValidationError(
                "Quiz is outside its availability window."
            )

        if not quiz.questions.exists():
            raise ValidationError(
                "Quiz has no questions."
            )

        active = Attempt.objects.filter(
            institute=self.scope.institute,
            quiz=quiz,
            student=request.user,
            submitted_at__isnull=True,
            deadline__gt=now,
        ).first()

        if active:
            return Response(
                attempt_data(active, self.scope.role)
            )

        attempt_count = Attempt.objects.filter(
            institute=self.scope.institute,
            quiz=quiz,
            student=request.user,
        ).count()

        if attempt_count >= quiz.attempt_limit:
            raise ValidationError(
                "Attempt limit reached."
            )

        attempt = Attempt.objects.create(
            institute=self.scope.institute,
            quiz=quiz,
            student=request.user,
            deadline=min(
                now + timedelta(minutes=quiz.minutes),
                quiz.closes_at,
            ),
        )

        return Response(
            attempt_data(attempt, self.scope.role),
            status=201,
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        instance = get_object_or_404(
            Quiz.objects.select_for_update(),
            pk=instance.pk,
            institute=self.scope.institute,
        )

        if instance.attempt_set.exists():
            raise ValidationError(
                "Quizzes with attempts must be retained."
            )

        super().perform_destroy(instance)


class QuestionViewSet(LearningViewSet):
    model = Question
    offering_path = "quiz__offering"

    filterset_fields = ["quiz"]
    search_fields = ["prompt"]

    @transaction.atomic
    def perform_create(self, serializer):
        quiz = get_object_or_404(
            Quiz.objects.select_for_update(),
            pk=serializer.validated_data["quiz"].pk,
            institute=self.scope.institute,
        )

        self.scope.check_offering(
            quiz.offering,
            write=True,
        )

        serializer.validated_data["quiz"] = quiz
        serializer.validate(serializer.validated_data)

        if "position" not in serializer.validated_data:
            serializer.validated_data["position"] = (
                quiz.questions.aggregate(
                    value=Max("position")
                )["value"] or 0
            ) + 1

        super().perform_create(serializer)

    @transaction.atomic
    def perform_update(self, serializer):
        old_quiz = get_object_or_404(
            Quiz.objects.select_for_update(),
            pk=serializer.instance.quiz_id,
            institute=self.scope.institute,
        )

        self.scope.check_offering(
            old_quiz.offering,
            write=True,
        )

        serializer.instance = get_object_or_404(
            Question,
            pk=serializer.instance.pk,
            institute=self.scope.institute,
        )

        serializer.validate(serializer.validated_data)

        super().perform_update(serializer)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset()

        if self.scope.role == "student":
            now = timezone.now()

            active_quiz_ids = Attempt.objects.filter(
                institute=self.scope.institute,
                student=self.request.user,
                submitted_at__isnull=True,
                deadline__gt=now,
            ).values("quiz_id")

            qs = qs.filter(
                quiz__published=True,
                quiz__opens_at__lte=now,
                quiz__closes_at__gt=now,
                quiz_id__in=active_quiz_ids,
            )

        return qs.order_by(
            "position",
            "created_at",
            "pk",
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        quiz = get_object_or_404(
            Quiz.objects.select_for_update(),
            pk=instance.quiz_id,
            institute=self.scope.institute,
        )

        if quiz.attempt_set.exists():
            raise ValidationError(
                "Questions are locked after attempts begin."
            )

        super().perform_destroy(instance)


def attempt_data(obj, role):
    return {
        "id": str(obj.pk),
        "quiz": str(obj.quiz_id),
        "student": str(obj.student_id),
        "student_label": obj.student.username,
        "started_at": obj.started_at,
        "deadline": obj.deadline,
        "submitted_at": obj.submitted_at,
        "answers": obj.answers,
        "marks": (
            obj.marks
            if role != "student" or obj.quiz.released
            else None
        ),
        "manual_marks": (
            obj.manual_marks
            if role != "student" or obj.quiz.released
            else {}
        ),
        "released": obj.quiz.released,
    }


def score_attempt(obj):
    total = Decimal("0")
    pending = False

    answers = obj.answers or {}
    manual_marks = obj.manual_marks or {}

    for question in obj.quiz.questions.all():
        question_id = str(question.pk)

        if question.kind == "short":
            if question_id not in manual_marks:
                pending = True
            else:
                total += Decimal(
                    str(manual_marks[question_id])
                )

        elif str(
            answers.get(question_id, "")
        ) == str(question.answer):
            total += Decimal(str(question.marks))

    obj.marks = None if pending else total


class AttemptViewSet(TenantViewSet):
    model = Attempt
    offering_path = "quiz__offering"

    http_method_names = [
        "get",
        "post",
        "head",
        "options",
    ]

    filterset_fields = ["quiz", "student"]

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

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset().select_related(
            "student",
            "quiz",
        )

        if self.scope.role == "student":
            return qs.filter(student=self.request.user)

        return qs

    @extend_schema(
        responses=AttemptResult(many=True)
    )
    def list(self, request):
        queryset = self.filter_queryset(
            self.get_queryset()
        )

        page = self.paginate_queryset(queryset)

        if page is not None:
            return self.get_paginated_response([
                attempt_data(a, self.scope.role)
                for a in page
            ])

        return Response([
            attempt_data(a, self.scope.role)
            for a in queryset
        ])

    @extend_schema(responses=AttemptResult)
    def retrieve(self, request, pk=None):
        return Response(
            attempt_data(
                self.get_object(),
                self.scope.role,
            )
        )

    def create(self, request):
        raise ValidationError(
            "Start an attempt through the quiz."
        )

    @extend_schema(
        request=AnswersInput,
        responses=AttemptResult,
    )
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def save_answers(self, request, pk=None):
        return self.process(request, False)

    @extend_schema(
        request=AnswersInput,
        responses=AttemptResult,
    )
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def submit(self, request, pk=None):
        return self.process(request, True)

    def process(self, request, submit):
        self.scope.require("student")

        scoped = self.get_object()

        obj = get_object_or_404(
            Attempt.objects.select_for_update(),
            pk=scoped.pk,
            institute=self.scope.institute,
        )

        self.scope.check_offering(
            obj.quiz.offering,
            write=True,
        )

        if obj.student_id != request.user.pk:
            raise PermissionDenied()

        if obj.submitted_at:
            raise ValidationError(
                "Attempt already submitted."
            )

        now = timezone.now()
        expired = now >= obj.deadline

        if not expired:
            answers = payload(
                AnswersInput,
                request.data,
            )["answers"]

            allowed = {
                str(q.pk): q
                for q in obj.quiz.questions.all()
            }

            if (
                not isinstance(answers, dict)
                or set(answers) - set(allowed)
            ):
                raise ValidationError(
                    "Invalid question identifiers."
                )

            for key, value in answers.items():
                if (
                    not isinstance(value, str)
                    or len(value) > 10000
                ):
                    raise ValidationError(
                        "Answers must be strings up to "
                        "10,000 characters."
                    )

            current_answers = dict(obj.answers or {})
            current_answers.update(answers)
            obj.answers = current_answers

        if submit or expired:
            obj.submitted_at = min(
                now,
                obj.deadline,
            )

            score_attempt(obj)

            Activity.objects.create(
                institute=self.scope.institute,
                user=request.user,
                offering=obj.quiz.offering,
                kind="quiz_submit",
            )

        obj.save()

        data = attempt_data(
            obj,
            self.scope.role,
        )

        data["expired"] = expired

        return Response(data)

    @extend_schema(
        request=AttemptGradeInput,
        responses=AttemptResult,
    )
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def grade(self, request, pk=None):
        self.scope.require("head", "teacher")

        scoped = self.get_object()

        obj = get_object_or_404(
            Attempt.objects.select_for_update(),
            pk=scoped.pk,
            institute=self.scope.institute,
        )

        require_assigned_instructor(
            self.scope,
            request.user,
            obj.quiz.offering,
        )

        require_unfinalized(obj)

        if not obj.submitted_at:
            raise ValidationError(
                "Attempt has not been submitted."
            )

        old = str(obj.marks)

        values = payload(
            AttemptGradeInput,
            request.data,
        )["manual_marks"]

        questions = {
            str(q.pk): q
            for q in obj.quiz.questions.filter(
                kind="short"
            )
        }

        if (
            not isinstance(values, dict)
            or set(values) - set(questions)
        ):
            raise ValidationError(
                "Only short answer questions "
                "can be manually graded."
            )

        manual_marks = dict(obj.manual_marks or {})

        for key, value in values.items():
            manual_marks[key] = float(
                marks_value(
                    value,
                    questions[key].marks,
                )
            )

        obj.manual_marks = manual_marks

        score_attempt(obj)
        obj.save()

        Audit.objects.create(
            institute=self.scope.institute,
            actor=request.user,
            action="Attempt.grade",
            object_id=str(obj.pk),
            detail={
                "previous_marks": old,
                "marks": str(obj.marks),
                "released": obj.quiz.released,
            },
        )

        if obj.quiz.released and obj.marks is not None:
            notify(
                obj.institute,
                [obj.student_id],
                "Quiz grade updated: " + obj.quiz.title,
                event_key=(
                    f"quiz-grade:{obj.pk}:{obj.marks}"
                ),
                destination=(
                    f"/attempts?quiz={obj.quiz_id}"
                ),
            )

        return Response(
            attempt_data(
                obj,
                self.scope.role,
            )
        )


class AttendanceSessionViewSet(LearningViewSet):
    model = AttendanceSession

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.instance = get_object_or_404(
            AttendanceSession.objects.select_for_update(),
            pk=serializer.instance.pk,
            institute=self.scope.institute,
        )

        require_unfinalized(serializer.instance)

        super().perform_update(serializer)

    @extend_schema(
        parameters=[RosterQuery],
        responses=RosterRow(many=True),
    )
    @action(
        detail=True,
        methods=["get"],
        filter_backends=[],
    )
    def roster(self, request, pk=None):
        return roster_response(self, request)

    @extend_schema(
        request=AttendanceInput,
        responses=AttendanceResult,
    )
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def mark(self, request, pk=None):
        self.scope.require("admin", "head", "teacher")

        scoped = self.get_object()

        session = get_object_or_404(
            AttendanceSession.objects.select_for_update(),
            pk=scoped.pk,
            institute=self.scope.institute,
        )

        self.scope.check_offering(
            session.offering,
            write=True,
        )

        require_unfinalized(session)

        records = payload(
            AttendanceInput,
            request.data,
        )["records"]

        if (
            not isinstance(records, list)
            or not records
            or len(records) > 500
        ):
            raise ValidationError(
                "Supply between 1 and 500 attendance records."
            )

        normalized = []

        for row in records:
            if (
                not isinstance(row, dict)
                or "student" not in row
                or row.get("status") not in (
                    "present",
                    "absent",
                    "late",
                    "excused",
                )
            ):
                raise ValidationError(
                    "Invalid attendance record."
                )

            normalized.append({
                "student": str(row["student"]),
                "status": row["status"],
            })

        student_ids = [
            row["student"]
            for row in normalized
        ]

        if len(student_ids) != len(set(student_ids)):
            raise ValidationError(
                "Duplicate student in request."
            )

        students = {
            str(student_id)
            for student_id in Enrollment.objects.filter(
                institute=self.scope.institute,
                offering=session.offering,
                active=True,
                student_id__in=student_ids,
            ).values_list(
                "student_id",
                flat=True,
            )
        }

        if set(student_ids) != students:
            raise ValidationError(
                "One or more students are not actively "
                "enrolled in this offering."
            )

        for row in normalized:
            obj, created = Attendance.objects.update_or_create(
                institute=self.scope.institute,
                session=session,
                student_id=row["student"],
                defaults={
                    "status": row["status"],
                },
            )

            self.audit(
                obj,
                "mark_" + row["status"],
            )

        return Response({
            "updated": len(normalized),
        })


class AttendanceViewSet(TenantViewSet):
    model = Attendance
    offering_path = "session__offering"

    http_method_names = [
        "get",
        "head",
        "options",
    ]

    filterset_fields = ["session", "student"]

    def get_serializer_class(self):
        return AttendanceHistorySerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset().select_related(
            "student",
            "session__offering",
        )

        if self.scope.role == "student":
            return qs.filter(
                student=self.request.user
            )

        return qs


class AnnouncementViewSet(LearningViewSet):
    model = Announcement
    offering_path = None

    filterset_fields = [
        "offering",
        "unit",
        "published",
    ]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset()
        scope = self.scope

        if scope.role in ("admin", "superadmin"):
            return qs

        audience = (
            Q(offering__in=scope.offerings())
            | Q(
                offering__isnull=True,
                unit__isnull=True,
            )
        )

        if scope.membership and scope.membership.unit_id:
            audience |= Q(
                offering__isnull=True,
                unit_id=scope.membership.unit_id,
            )

        qs = qs.filter(audience)

        editable = Q(pk__in=[])

        if scope.role == "teacher":
            editable = Q(
                offering__in=scope.offerings()
            )

        elif (
            scope.role == "head"
            and scope.membership
            and scope.membership.unit_id
        ):
            editable = Q(
                unit_id=scope.membership.unit_id
            )

        return qs.filter(
            Q(published=True) | editable
        ).distinct()

    @transaction.atomic
    def perform_create(self, serializer):
        super().perform_create(serializer)

        if serializer.instance.published:
            self.announce(serializer.instance)

    @transaction.atomic
    def perform_update(self, serializer):
        self.check_author_scope(
            serializer.instance
        )

        was_published = serializer.instance.published

        super().perform_update(serializer)

        if (
            serializer.instance.published
            and not was_published
        ):
            self.announce(serializer.instance)

    def perform_destroy(self, instance):
        self.check_author_scope(instance)
        super().perform_destroy(instance)

    def check_author_scope(self, obj):
        if self.scope.role == "teacher":
            if (
                not obj.offering_id
                or not self.scope.offerings().filter(
                    pk=obj.offering_id
                ).exists()
            ):
                raise PermissionDenied(
                    "Teachers can only manage announcements "
                    "for their assigned offerings."
                )

        if self.scope.role == "head":
            if (
                not self.scope.membership
                or not self.scope.membership.unit_id
                or obj.unit_id
                != self.scope.membership.unit_id
            ):
                raise PermissionDenied(
                    "Department heads can only manage "
                    "announcements in their unit."
                )

    def announce(self, obj):
        members = Membership.objects.filter(
            institute=obj.institute,
            active=True,
        )

        if obj.offering_id:
            members = members.filter(
                Q(
                    user__enrollment__offering=obj.offering,
                    user__enrollment__active=True,
                )
                | Q(
                    user__teaching=obj.offering
                )
            )

        elif obj.unit_id:
            members = members.filter(
                unit=obj.unit
            )

        notify(
            obj.institute,
            members.distinct().values_list(
                "user_id",
                flat=True,
            ),
            obj.title,
            obj.body,
            event_key=f"announcement:{obj.pk}",
            destination="/announcements",
        )


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


class ManualGradeViewSet(LearningViewSet):
    model = ManualGrade

    filterset_fields = [
        "offering",
        "student",
    ]

    def perform_destroy(self, instance):
        raise ValidationError(
            "Assessment records must be retained. "
            "Use an audited correction instead of deleting marks."
        )

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

    @transaction.atomic
    def perform_create(self, serializer):
        super().perform_create(serializer)

        obj = serializer.instance

        Audit.objects.create(
            institute=obj.institute,
            actor=self.request.user,
            action="ManualGrade.history",
            object_id=str(obj.pk),
            detail={
                "previous": None,
                "marks": str(obj.marks),
                "released": obj.released,
            },
        )

        if obj.released:
            notify(
                obj.institute,
                [obj.student_id],
                "Assessment grade released: " + obj.title,
                event_key=(
                    f"manual-grade:{obj.pk}:{obj.marks}"
                ),
                destination="/grades",
            )

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        qs = super().get_queryset()

        if self.scope.role == "student":
            return qs.filter(
                student=self.request.user,
                released=True,
            )

        return qs

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.instance = get_object_or_404(
            ManualGrade.objects.select_for_update(),
            pk=serializer.instance.pk,
            institute=self.scope.institute,
        )

        require_unfinalized(serializer.instance)

        previous = {
            "marks": str(serializer.instance.marks),
            "released": serializer.instance.released,
        }

        super().perform_update(serializer)

        Audit.objects.create(
            institute=self.scope.institute,
            actor=self.request.user,
            action="ManualGrade.history",
            object_id=str(serializer.instance.pk),
            detail={
                "previous": previous,
                "marks": str(serializer.instance.marks),
                "released": serializer.instance.released,
            },
        )

        if serializer.instance.released:
            notify(
                self.scope.institute,
                [serializer.instance.student_id],
                (
                    "Assessment grade released: "
                    + serializer.instance.title
                ),
                event_key=(
                    f"manual-grade:{serializer.instance.pk}:"
                    f"{serializer.instance.marks}"
                ),
                destination="/grades",
            )


class BankQuestionViewSet(TenantViewSet):
    model = BankQuestion

    write_roles = ("admin", "head", "teacher")

    search_fields = ["prompt"]
    filterset_fields = ["kind", "unit"]

    def get_serializer_class(self):
        return serializer_for(
            BankQuestion,
            LearningSerializer,
            ("author",),
        )

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()

        self.scope.require(
            "admin",
            "head",
            "teacher",
        )

        qs = super().get_queryset()

        if self.scope.role == "teacher":
            return qs.filter(
                author=self.request.user
            )

        if self.scope.role == "head":
            if self.scope.membership and self.scope.membership.unit_id:
                return qs.filter(
                    unit_id=self.scope.membership.unit_id
                )

            return qs.none()

        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        self.scope.require(*self.write_roles)

        extra = (
            {
                "unit": self.scope.membership.unit
            }
            if self.scope.role in ("head", "teacher")
            else {}
        )

        obj = serializer.save(
            institute=self.scope.institute,
            author=self.request.user,
            **extra,
        )

        self.audit(obj, "create")

    @extend_schema(
        request=BankCopyInput,
        responses={
            201: serializer_for(
                Question,
                LearningSerializer,
            )
        },
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="copy-to-quiz",
    )
    @transaction.atomic
    def copy_to_quiz(self, request, pk=None):
        bank = self.get_object()

        data = {
            name: getattr(bank, name)
            for name in (
                "prompt",
                "kind",
                "options",
                "answer",
                "marks",
            )
        }

        data["quiz"] = payload(
            BankCopyInput,
            request.data,
        )["quiz"]

        serializer = serializer_for(
            Question,
            LearningSerializer,
        )(
            data=data,
            context={"request": request},
        )

        serializer.is_valid(
            raise_exception=True
        )

        quiz = get_object_or_404(
            Quiz.objects.select_for_update(),
            pk=serializer.validated_data["quiz"].pk,
            institute=self.scope.institute,
        )

        self.scope.check_offering(
            quiz.offering,
            write=True,
        )

        serializer.validated_data["quiz"] = quiz

        serializer.validate(
            serializer.validated_data
        )

        position = (
            quiz.questions.aggregate(
                value=Max("position")
            )["value"] or 0
        ) + 1

        question = serializer.save(
            institute=self.scope.institute,
            position=position,
        )

        self.audit(
            question,
            "copy_to_quiz",
        )

        return Response(
            serializer.data,
            status=201,
        )