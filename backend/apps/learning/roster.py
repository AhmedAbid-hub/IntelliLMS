from django.db.models import OuterRef, Q, Subquery
from rest_framework import serializers
from apps.academics.models import Enrollment
from .models import Attendance


class AttendanceHistorySerializer(serializers.ModelSerializer):
    student_label = serializers.CharField(source="student.username", read_only=True)
    session_label = serializers.CharField(source="session.title", read_only=True)
    session_date = serializers.DateField(source="session.date", read_only=True)
    offering = serializers.UUIDField(source="session.offering_id", read_only=True)
    offering_label = serializers.CharField(source="session.offering.title", read_only=True)

    class Meta:
        model = Attendance
        fields = ["id", "institute", "session", "student", "status", "created_at", "student_label", "session_label", "session_date", "offering", "offering_label"]
        read_only_fields = fields


class RosterQuery(serializers.Serializer):
    search = serializers.CharField(required=False, allow_blank=True, max_length=120)
    page = serializers.IntegerField(required=False, min_value=1)


class RosterRow(serializers.Serializer):
    id = serializers.UUIDField()
    student = serializers.UUIDField(source="student_id")
    student_label = serializers.SerializerMethodField()
    status = serializers.CharField(allow_null=True)

    def get_student_label(self, obj) -> str:
        return obj.student.get_full_name() or obj.student.username


def roster_response(view, request):
    view.scope.require("admin", "head", "teacher")
    session = view.get_object()
    query = RosterQuery(data=request.query_params.dict())
    query.is_valid(raise_exception=True)
    rows = Enrollment.objects.filter(
        institute=view.scope.institute, offering=session.offering, active=True,
    ).select_related("student").annotate(
        status=Subquery(Attendance.objects.filter(
            institute=view.scope.institute, session=session, student_id=OuterRef("student_id"),
        ).values("status")[:1])
    ).order_by("student__username", "pk")
    search = query.validated_data.get("search")
    if search:
        rows = rows.filter(Q(student__username__icontains=search) | Q(student__first_name__icontains=search) | Q(student__last_name__icontains=search))
    return view.get_paginated_response(RosterRow(view.paginate_queryset(rows), many=True).data)
