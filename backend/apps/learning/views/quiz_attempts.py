"""Learning quiz attempts API; extracted without changing behavior."""
from decimal import Decimal
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from apps.academics.views import TenantViewSet
from apps.insights.models import Activity, Audit
from ..contracts import AnswersInput, AttemptGradeInput, AttemptResult, GradeHistoryEvent, payload
from ..models import Attempt
from ..history import grade_history
from ..governance import require_unfinalized
from ..notifications import notify_event as notify
from .base import marks_value, require_assigned_instructor


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
