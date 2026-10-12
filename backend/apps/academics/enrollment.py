from uuid import uuid4
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import OuterRef, Subquery, Q
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema
from apps.accounts.models import Membership, Institute
from apps.insights.models import Audit
from .models import Enrollment


class Candidate(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username")
    first_name = serializers.CharField(source="user.first_name")
    enrollment_active = serializers.BooleanField(allow_null=True, read_only=True)

    class Meta:
        model = Membership
        fields = ["id", "user", "username", "first_name", "display_name", "student_identifier", "section", "enrollment_active"]


class BulkEnrollmentInput(serializers.Serializer):
    students = serializers.ListField(child=serializers.UUIDField(), min_length=1, max_length=100)
    operation = serializers.ChoiceField(choices=["enroll", "withdraw", "reactivate"])
    reason = serializers.CharField(min_length=5, max_length=1000)


class BulkEnrollmentResult(serializers.Serializer):
    changed = serializers.IntegerField()
    unchanged = serializers.IntegerField()


class EnrollmentActions:
    @extend_schema(responses=Candidate(many=True))
    @action(detail=True, methods=["get"], url_path="enrollment-candidates")
    def enrollment_candidates(self, request, pk=None):
        self.scope.require("admin", "head")
        # Search belongs to the student roster, not the parent offering list.
        offering = get_object_or_404(self.get_queryset(), pk=pk)
        self.check_object_permissions(request, offering)
        qs = Membership.objects.filter(institute=self.scope.institute, role="student", active=True, user__is_active=True).select_related("user")
        if self.scope.role == "head":
            qs = qs.filter(unit_id=self.scope.membership.unit_id)
        search = request.query_params.get("search", "").strip()[:150]
        if search:
            qs = qs.filter(Q(user__username__icontains=search) | Q(user__first_name__icontains=search) | Q(user__last_name__icontains=search) | Q(display_name__icontains=search) | Q(student_identifier__icontains=search))
        qs = qs.annotate(enrollment_active=Subquery(Enrollment.objects.filter(offering=offering, student_id=OuterRef("user_id")).values("active")[:1])).order_by("user__username", "pk")
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(Candidate(page, many=True).data)

    @extend_schema(request=BulkEnrollmentInput, responses=BulkEnrollmentResult)
    @action(detail=True, methods=["post"], url_path="bulk-enrollment")
    @transaction.atomic
    def bulk_enrollment(self, request, pk=None):
        self.scope.require("admin", "head")
        Institute.objects.select_for_update().get(pk=self.scope.institute.pk)
        offering = self.get_object()
        self.scope.check_offering(offering, write=True)
        values = BulkEnrollmentInput(data=request.data)
        values.is_valid(raise_exception=True)
        data = values.validated_data
        ids = set(data["students"])
        members = Membership.objects.filter(institute=self.scope.institute, user_id__in=ids, role="student", active=True, user__is_active=True)
        if self.scope.role == "head":
            members = members.filter(unit_id=self.scope.membership.unit_id)
        if members.count() != len(ids):
            raise ValidationError("Every selected student must have an active membership in your permitted scope.")
        existing = {row.student_id: row for row in Enrollment.objects.filter(offering=offering, student_id__in=ids)}
        if data["operation"] != "enroll" and ids - existing.keys():
            raise ValidationError("Withdraw/reactivate only students with an existing enrollment.")
        changes = []
        for student_id in ids:
            row = existing.get(student_id)
            before = row.active if row else None
            active = data["operation"] != "withdraw"
            if row is None:
                Enrollment.objects.create(institute=self.scope.institute, offering=offering, student_id=student_id, active=active)
            elif row.active != active:
                row.active = active
                row.save(update_fields=["active"])
            else:
                continue
            changes.append({"student": str(student_id), "previous": before, "active": active})
        if changes:
            from apps.learning.notifications import notify_event
            for change in changes:
                notify_event(self.scope.institute,[change["student"]],("Course enrollment updated: " if change["active"] else "Course withdrawal: ")+offering.title,event_key=f"enrollment:{offering.pk}:{change['student']}:{data['operation']}:{uuid4()}",destination=f"/course/{offering.pk}" if change["active"] else "/offerings")
            Audit.objects.create(institute=self.scope.institute, actor=request.user, action="Enrollment.bulk_" + data["operation"], object_id=str(offering.pk), detail={"reason": data["reason"], "changes": changes})
        return Response({"changed": len(changes), "unchanged": len(ids) - len(changes)})
