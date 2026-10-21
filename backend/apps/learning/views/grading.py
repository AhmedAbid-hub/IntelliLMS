"""Learning grading API; extracted without changing behavior."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from apps.insights.models import Audit
from ..contracts import GradeHistoryEvent
from ..models import ManualGrade
from ..history import grade_history
from ..governance import require_unfinalized
from ..notifications import notify_event as notify
from .base import LearningViewSet, require_assigned_instructor


class ManualGradeViewSet(LearningViewSet):
    model = ManualGrade
    write_roles = ("head", "teacher")

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
        require_assigned_instructor(
            self.scope, self.request.user, serializer.validated_data["offering"]
        )
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

        require_assigned_instructor(
            self.scope, self.request.user, serializer.instance.offering
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
