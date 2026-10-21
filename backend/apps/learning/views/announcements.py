"""Learning announcements API; extracted without changing behavior."""
from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied
from apps.accounts.models import Membership
from ..models import Announcement
from ..notifications import notify_event as notify
from .base import LearningViewSet


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
