"""Learning question bank API; extracted without changing behavior."""
from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from apps.academics.views import TenantViewSet
from apps.academics.serializers import serializer_for
from ..contracts import BankCopyInput, payload
from ..models import Quiz, Question, BankQuestion
from ..serializers import LearningSerializer
from .base import require_assigned_instructor


class BankQuestionViewSet(TenantViewSet):
    model = BankQuestion

    write_roles = ("teacher",)

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

        if self.scope.role not in ("admin", "head", "teacher"):
            raise PermissionDenied("Question banks are available to institute academic staff only.")

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

        if self.scope.role != "teacher":
            raise PermissionDenied("Use your authorized teaching workspace to author questions.")

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

        require_assigned_instructor(self.scope, self.request.user, quiz.offering)

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
