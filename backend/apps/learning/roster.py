
from django.db.models import OuterRef, Q, Subquery
from rest_framework import serializers

from apps.academics.models import Enrollment
from .models import Attendance


class AttendanceHistorySerializer(serializers.ModelSerializer):
    student_label = serializers.CharField(
        source="student.username",
        read_only=True,
    )
    session_label = serializers.CharField(
        source="session.title",
        read_only=True,
    )
    session_date = serializers.DateField(
        source="session.date",
        read_only=True,
    )
    offering = serializers.UUIDField(
        source="session.offering_id",
        read_only=True,
    )
    offering_label = serializers.CharField(
        source="session.offering.title",
        read_only=True,
    )

    class Meta:
        model = Attendance
        fields = [
            "id",
            "institute",
            "session",
            "student",
            "status",
            "created_at",
            "student_label",
            "session_label",
            "session_date",
            "offering",
            "offering_label",
        ]
        read_only_fields = fields


class RosterQuery(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=120,
    )
    page = serializers.IntegerField(
        required=False,
        min_value=1,
    )


class RosterRow(serializers.Serializer):
    # Preserve the original enrollment ID.
    id = serializers.UUIDField()

    student = serializers.UUIDField(
        source="student_id",
    )

    student_label = serializers.SerializerMethodField()

    status = serializers.CharField(
        allow_null=True,
    )

    # Actual attendance record ID.
    # Null when attendance has not been recorded.
    attendance_id = serializers.UUIDField(
        allow_null=True,
        read_only=True,
    )

    # Indicates whether the attendance record
    # has been finalized.
    finalized = serializers.BooleanField(
        read_only=True,
    )

    def get_student_label(self, obj) -> str:
        return (
            obj.student.get_full_name()
            or obj.student.username
        )


def roster_response(view, request):
    view.scope.require(
        "admin",
        "head",
        "teacher",
    )

    session = view.get_object()

    query = RosterQuery(
        data=request.query_params.dict(),
    )
    query.is_valid(raise_exception=True)

    attendance_records = Attendance.objects.filter(
        institute=view.scope.institute,
        session=session,
        student_id=OuterRef("student_id"),
    )

    rows = (
        Enrollment.objects.filter(
            institute=view.scope.institute,
            offering=session.offering,
            active=True,
        )
        .select_related("student")
        .annotate(
            status=Subquery(
                attendance_records.values("status")[:1]
            ),
            attendance_id=Subquery(
                attendance_records.values("id")[:1]
            ),
        )
        .order_by(
            "student__username",
            "pk",
        )
    )

    search = query.validated_data.get("search")

    if search:
        rows = rows.filter(
            Q(student__username__icontains=search)
            | Q(student__first_name__icontains=search)
            | Q(student__last_name__icontains=search)
        )

    # The existing code does not establish where
    # attendance finalization is stored.
    # Do not invent a database field or infer that
    # a recorded status means finalized.
    #
    # Once the actual finalization model is verified,
    # annotate its value here.
    #
    # Until then, expose finalized=False only as
    # a compatibility default. The backend must
    # independently enforce any finalization locks.
    for row in rows if False else ():
        pass

    page = view.paginate_queryset(rows)

    # Apply the compatibility value only to the
    # paginated records being serialized.
    for row in page:
        row.finalized = False

    return view.get_paginated_response(
        RosterRow(
            page,
            many=True,
        ).data
    )
