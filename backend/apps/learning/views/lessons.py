"""Learning lessons API; extracted without changing behavior."""
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.insights.models import Activity
from ..contracts import CompletionResult
from ..models import Module, Lesson, Completion
from .base import LearningViewSet


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
