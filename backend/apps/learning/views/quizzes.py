"""Learning quizzes API; extracted without changing behavior."""
from datetime import timedelta
from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from ..contracts import AttemptResult
from ..models import Quiz, Question, Attempt
from ..authoring import QuizAuthoringActions
from ..notifications import notify_event as notify
from .base import LearningViewSet, require_assigned_instructor
from .quiz_attempts import attempt_data


class QuizViewSet(QuizAuthoringActions, LearningViewSet):
    model = Quiz

    def perform_create(self, serializer):
        if serializer.validated_data.get("released"):
            require_assigned_instructor(
                self.scope, self.request.user, serializer.validated_data["offering"]
            )
        super().perform_create(serializer)

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.instance = get_object_or_404(
            Quiz.objects.select_for_update(),
            pk=serializer.instance.pk,
            institute=self.scope.institute,
        )

        serializer.validate(serializer.validated_data)

        was_released = serializer.instance.released

        if was_released and self.scope.institute.grading_rules.get("lock_released_grades", False) and serializer.validated_data.get("released") is False:
            raise ValidationError("Institute policy protects released quiz results. Use audited attempt corrections instead of withdrawing release to edit marks.")

        if "released" in serializer.validated_data:
            require_assigned_instructor(
                self.scope, self.request.user, serializer.instance.offering
            )

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
