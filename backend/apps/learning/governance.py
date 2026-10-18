from decimal import Decimal

from django.db import transaction

from django.shortcuts import get_object_or_404

from django.utils import timezone

from drf_spectacular.utils import extend_schema

from rest_framework import serializers, viewsets

from rest_framework.decorators import api_view, action

from rest_framework.exceptions import PermissionDenied, ValidationError

from rest_framework.response import Response

from apps.accounts.scope import Scope

from apps.accounts.models import Institute, Membership

from apps.accounts.contracts import payload

from apps.insights.models import Audit

from .notifications import notify_event
from .policies import academic_lock_reason

from .models import (

    Submission,

    Attempt,

    ManualGrade,

    Attendance,

    AttendanceSession,

    CorrectionRequest,

)

TARGETS = {

    "submission": (Submission, "assignment__offering"),

    "attempt": (Attempt, "quiz__offering"),

    "manual": (ManualGrade, "offering"),

    "attendance": (Attendance, "session__offering"),

    "attendance_session": (AttendanceSession, "offering"),

}

def staff(request, lock=False):

    scope = Scope(request)

    if lock:

        Institute.objects.select_for_update().get(

            pk=scope.institute.pk

        )

        if hasattr(request, "_intellilms_scope"):

            del request._intellilms_scope

        scope = Scope(request)

    if scope.role not in ("admin", "head", "teacher"):

        raise PermissionDenied(

            "Only authorized academic staff can access academic controls."

        )

    return scope

def target_record(scope, kind, pk, lock=False):

    if kind not in TARGETS:

        raise ValidationError("Unsupported academic record type.")

    model, path = TARGETS[kind]

    queryset = model.objects.filter(

        institute=scope.institute,

        **{path + "__in": scope.offerings()},

    )

    if lock:

        queryset = queryset.select_for_update()

    obj = get_object_or_404(queryset, pk=pk)

    offering = obj

    for segment in path.split("__"):

        offering = getattr(offering, segment)

    return obj, offering

def locked_record(obj):

    if isinstance(obj, Attendance):

        return obj.session

    return obj

def require_unfinalized(obj):
    reason = academic_lock_reason(obj)
    if reason:
        raise ValidationError(reason + " Use Academic control to request an audited correction.")

def assigned_instructor(scope, offering):

    return (

        (scope.role == "teacher" or (scope.role == "head" and scope.membership.can_teach))

        and scope.teaching_offerings().filter(pk=offering.pk).exists()

    )

def require_correction_request_permission(scope, offering):

    """

    Institute administrators can request an audited correction.

    Teachers and department heads can request corrections only

    when personally assigned to teach the relevant offering.

    Department heads do not gain teaching permissions merely

    because they oversee a department.

    """

    scope.check_offering(offering, write=False)

    if scope.role == "admin":

        return

    if not assigned_instructor(scope, offering):

        raise PermissionDenied(

            "Only an assigned instructor can request corrections "

            "for this class."

        )

def reviewer(scope, offering):
    """Allow institute admins and expressly delegated heads of the course's unit.

    Department heads cannot review other departments' courses, even when
    they have teaching assignments outside their home department.
    """
    if scope.role == "admin":
        return True

    if scope.role != "head" or scope.membership is None or not offering.head_correction_review:
        return False

    department_id = scope.membership.unit_id
    if department_id is None:
        return False

    if str(offering.course.unit_id) != str(department_id):
        return False

    return scope.offerings().filter(pk=offering.pk).exists()

def can_review_request(scope, offering, requester_id):

    return (

        reviewer(scope, offering)

        and str(requester_id) != str(scope.user.pk)

    )

def snapshot(obj):

    if isinstance(obj, Attendance):

        return {

            "status": obj.status,

        }

    if isinstance(obj, AttendanceSession):

        return {

            "finalized": obj.finalized,

        }

    data = {

        "marks": (

            str(obj.marks)

            if obj.marks is not None

            else None

        )

    }

    if isinstance(obj, Attempt):

        data["manual_marks"] = dict(

            obj.manual_marks or {}

        )

    else:

        data.update(

            feedback=obj.feedback,

            released=obj.released,

        )

    return data

def proposal(obj, values):

    if not isinstance(values, dict) or not values:

        raise ValidationError(

            "Supply the proposed correction."

        )

    current = snapshot(obj)

    if isinstance(obj, Attendance):

        allowed = {"status"}

    elif isinstance(obj, Attempt):

        allowed = {"manual_marks"}

    elif isinstance(obj, AttendanceSession):

        raise ValidationError(

            "Request a correction for an individual attendance record."

        )

    else:

        allowed = {

            "marks",

            "feedback",

            "released",

        }

    if set(values) - allowed:

        raise ValidationError(

            "Only supported academic values can be corrected "

            "through this action."

        )

    if isinstance(obj, Attendance):

        if "status" not in values:

            raise ValidationError(

                "Provide the proposed attendance status."

            )

        current["status"] = serializers.ChoiceField(

            choices=[

                "present",

                "absent",

                "late",

                "excused",

            ]

        ).run_validation(values["status"])

    elif isinstance(obj, Attempt):

        if not obj.submitted_at:

            raise ValidationError(

                "Submit the attempt before requesting a correction."

            )

        if "manual_marks" not in values:

            raise ValidationError(

                "Provide the proposed manual marks."

            )

        fields = serializers.DictField(

            child=serializers.DecimalField(

                max_digits=7,

                decimal_places=2,

                min_value=0,

            )

        ).run_validation(values["manual_marks"])

        questions = {

            str(question.pk): question

            for question in obj.quiz.questions.filter(

                kind="short"

            )

        }

        if set(fields) - set(questions):

            raise ValidationError(

                "Only short-answer marks can be corrected."

            )

        for key, value in fields.items():

            if value > questions[key].marks:

                raise ValidationError(

                    "Marks exceed the question maximum."

                )

        updated_marks = {

            **current["manual_marks"],

            **{

                key: float(value)

                for key, value in fields.items()

            },

        }

        current["manual_marks"] = updated_marks

        from .views import score_attempt

        original_manual_marks = obj.manual_marks

        original_marks = obj.marks

        try:

            obj.manual_marks = updated_marks

            score_attempt(obj)

            current["marks"] = (

                str(obj.marks)

                if obj.marks is not None

                else None

            )

        finally:

            obj.manual_marks = original_manual_marks

            obj.marks = original_marks

    else:

        maximum = (

            obj.assignment.max_marks

            if isinstance(obj, Submission)

            else obj.max_marks

        )

        if "marks" in values:

            marks = serializers.DecimalField(

                max_digits=7,

                decimal_places=2,

                min_value=0,

                max_value=maximum,

            ).run_validation(values["marks"])

            current["marks"] = str(marks)

        if "feedback" in values:

            current["feedback"] = serializers.CharField(

                allow_blank=True,

                max_length=10000,

            ).run_validation(values["feedback"])

        if "released" in values:

            current["released"] = serializers.BooleanField(

            ).run_validation(values["released"])

    return current

def apply_proposal(obj, proposed):

    """

    Apply only validated fields.

    JSON snapshots store marks as strings. Django model fields

    receive Decimal values when marks are updated.

    """

    for key, value in proposed.items():

        if key == "marks":

            value = (

                Decimal(str(value))

                if value is not None

                else None

            )

        setattr(obj, key, value)

    obj.save(

        update_fields=list(proposed.keys())

    )

def validate_unchanged_record(obj, record):

    if snapshot(obj) != record.original:

        raise ValidationError(

            "The academic record changed after this request. "

            "Reject this request and create a fresh correction."

        )

def validate_stored_proposal(obj, record):

    source = (

        {

            "manual_marks": record.proposed["manual_marks"]

        }

        if isinstance(obj, Attempt)

        else record.proposed

    )

    checked = proposal(obj, source)

    if checked != record.proposed:

        raise ValidationError(

            "Assessment rules changed after the request. "

            "Create a fresh correction."

        )

    return checked

def student_recipient(obj):

    """

    Return the affected student's ID without assuming that

    every academic model stores student_id directly.

    """

    if isinstance(obj, Attendance):

        return obj.student_id

    if isinstance(obj, Submission):

        return obj.student_id

    if isinstance(obj, Attempt):

        return obj.student_id

    if isinstance(obj, ManualGrade):

        return obj.student_id

    return None

def notify_student_of_correction(

    institute,

    obj,

    record,

):

    student_id = student_recipient(obj)

    if student_id is None:

        return

    notify_event(

        institute,

        [student_id],

        "Academic record corrected",

        event_key=(

            f"correction:{record.pk}:approved"

        ),

        destination=(

            "/attendance"

            if record.kind == "attendance"

            else "/grades"

        ),

    )

def audit_correction(

    scope,

    actor,

    action,

    obj,

    record,

    extra=None,

):

    detail = {

        "request": str(record.pk),

        "kind": record.kind,

        "decision": record.status,

        "reason": record.decision_reason,

        "request_reason": record.reason,

        "previous": record.original,

        "proposed": record.proposed,

        "marks": snapshot(obj).get("marks"),

        "released": snapshot(obj).get("released"),

    }

    if extra:

        detail.update(extra)

    Audit.objects.create(

        institute=scope.institute,

        actor=actor,

        action=action,

        object_id=str(obj.pk),

        detail=detail,

    )

class RecordInput(serializers.Serializer):

    kind = serializers.ChoiceField(

        choices=list(TARGETS)

    )

    target = serializers.UUIDField()

class FinalizeInput(RecordInput):

    finalized = serializers.BooleanField()

    reason = serializers.CharField(

        min_length=5,

        max_length=1000,

    )

class CorrectionInput(RecordInput):

    proposed = serializers.JSONField()

    reason = serializers.CharField(

        min_length=5,

        max_length=1000,

    )

class DecisionInput(serializers.Serializer):

    decision = serializers.ChoiceField(

        choices=[

            "approved",

            "rejected",

        ]

    )

    reason = serializers.CharField(

        min_length=5,

        max_length=1000,

    )

class ControlResult(serializers.Serializer):
    lock_reason = serializers.CharField(allow_null=True, required=False)

    kind = serializers.CharField()

    target = serializers.UUIDField()

    finalized = serializers.BooleanField()

    current = serializers.JSONField()

    can_finalize = serializers.BooleanField()

    can_review = serializers.BooleanField()

    questions = serializers.ListField(

        child=serializers.DictField(),

        required=False,

    )

@extend_schema(

    parameters=[RecordInput],

    responses=ControlResult,

)

@api_view(["GET"])

def record_control(request):

    scope = staff(request)

    values = payload(

        RecordInput,

        request.query_params,

    )

    obj, offering = target_record(

        scope,

        values["kind"],

        values["target"],

    )

    questions = []

    if isinstance(obj, Attempt):

        questions = [

            {

                "id": str(question.pk),

                "prompt": question.prompt,

                "marks": question.marks,

            }

            for question in obj.quiz.questions.filter(

                kind="short"

            )

        ]

    return Response(

        {

            "kind": values["kind"],

            "target": obj.pk,

            "finalized": locked_record(obj).finalized,
            "lock_reason": academic_lock_reason(obj),

            "current": snapshot(obj),

            "can_finalize": scope.role == "admin",

            "can_review": reviewer(scope, offering),

            "questions": questions,

        }

    )

@extend_schema(

    request=FinalizeInput,

    responses=ControlResult,

)

@api_view(["POST"])

@transaction.atomic

def finalize_record(request):

    scope = staff(request, lock=True)

    if scope.role != "admin":

        raise PermissionDenied(

            "Only Institute Admin can finalize academic records."

        )

    values = payload(

        FinalizeInput,

        request.data,

    )

    obj, offering = target_record(

        scope,

        values["kind"],

        values["target"],

        lock=True,

    )

    if isinstance(obj, Attendance):

        raise ValidationError(

            "Finalize the attendance session, "

            "not individual attendance rows."

        )

    if values["finalized"]:

        if isinstance(obj, AttendanceSession):

            if not Attendance.objects.filter(

                session=obj

            ).exists():

                raise ValidationError(

                    "Record attendance before finalizing the session."

                )

        else:

            if obj.marks is None:

                raise ValidationError(

                    "Record marks before finalizing."

                )

            if (

                isinstance(obj, Attempt)

                and not obj.submitted_at

            ):

                raise ValidationError(

                    "Submit the attempt before finalizing."

                )

    previous = obj.finalized

    if previous == values["finalized"]:

        raise ValidationError(

            "The record already has the requested finalization state."

        )

    obj.finalized = values["finalized"]

    obj.save(

        update_fields=["finalized"]

    )

    Audit.objects.create(

        institute=scope.institute,

        actor=request.user,

        action="Academic.finalization",

        object_id=str(obj.pk),

        detail={

            "kind": values["kind"],

            "previous": previous,

            "finalized": obj.finalized,

            "reason": values["reason"],

        },

    )

    return Response(

        {

            "kind": values["kind"],

            "target": obj.pk,

            "finalized": obj.finalized,

            "current": snapshot(obj),

            "can_finalize": True,

            "can_review": True,

        }

    )

class CorrectionSerializer(serializers.ModelSerializer):

    requester_label = serializers.CharField(

        source="requester.username",

        read_only=True,

    )

    reviewer_label = serializers.CharField(

        source="reviewer.username",

        read_only=True,

        allow_null=True,

    )

    offering_label = serializers.CharField(

        source="offering.title",

        read_only=True,

    )

    class Meta:

        model = CorrectionRequest

        fields = "__all__"

        read_only_fields = [

            field.name

            for field in CorrectionRequest._meta.fields

        ]

class CorrectionViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = CorrectionSerializer

    filterset_fields = [

        "status",

        "kind",

        "offering",

        "target",

    ]

    search_fields = [

        "reason",

        "offering__title",

        "requester__username",

    ]

    def get_queryset(self):

        if getattr(

            self,

            "swagger_fake_view",

            False,

        ):

            return CorrectionRequest.objects.none()

        scope = staff(self.request)

        return (

            CorrectionRequest.objects.filter(

                institute=scope.institute,

                offering__in=scope.offerings(),

            )

            .select_related(

                "requester",

                "reviewer",

                "offering",

            )

            .order_by(

                "-created_at",

                "-pk",

            )

        )

    @extend_schema(

        request=CorrectionInput,

        responses=CorrectionSerializer,

    )

    @transaction.atomic

    def create(self, request):

        scope = staff(

            request,

            lock=True,

        )

        values = payload(

            CorrectionInput,

            request.data,

        )

        if values["kind"] == "attendance_session":

            raise ValidationError(

                "Request a correction for an individual attendance record."

            )

        obj, offering = target_record(

            scope,

            values["kind"],

            values["target"],

            lock=True,

        )

        require_correction_request_permission(

            scope,

            offering,

        )

        if CorrectionRequest.objects.filter(

            institute=scope.institute,

            kind=values["kind"],

            target=obj.pk,

            status="pending",

        ).exists():

            raise ValidationError(

                "A correction is already pending for this record."

            )

        original = snapshot(obj)

        proposed = proposal(

            obj,

            values["proposed"],

        )

        if original == proposed:

            raise ValidationError(

                "The proposed correction does not change this record."

            )

        record = CorrectionRequest.objects.create(

            institute=scope.institute,

            offering=offering,

            kind=values["kind"],

            target=obj.pk,

            requester=request.user,

            original=original,

            proposed=proposed,

            reason=values["reason"],

        )

        Audit.objects.create(

            institute=scope.institute,

            actor=request.user,

            action="Academic.correction_requested",

            object_id=str(obj.pk),

            detail={

                "request": str(record.pk),

                "kind": record.kind,

                "reason": record.reason,

                "previous": original,

                "proposed": proposed,

            },

        )

        admin_recipients = list(

            Membership.objects.filter(

                institute=scope.institute,

                active=True,

                role="admin",

            ).exclude(

                user_id=request.user.pk

            ).values_list(

                "user_id",

                flat=True,

            )

        )

        if admin_recipients:

            notify_event(

                scope.institute,

                admin_recipients,

                "Academic correction awaiting review",

                record.reason,

                event_key=(

                    f"correction:{record.pk}:review:admin"

                ),

                destination="/academic-reviews",

            )

        # Notify only active heads of the course's own department.
        # Review authorization is still checked by reviewer() on access.
        head_recipients = list(
            Membership.objects.filter(
                institute=scope.institute,
                active=True,
                role="head",
                unit_id=offering.course.unit_id,
            )
            .exclude(user_id=request.user.pk)
            .values_list("user_id", flat=True)
        )

        if offering.head_correction_review and scope.institute.kind != "school" and head_recipients:
            notify_event(
                scope.institute,
                head_recipients,
                "Academic correction awaiting review",
                record.reason,
                event_key=f"correction:{record.pk}:review:head",
                destination="/academic-reviews",
            )

        return Response(

            self.get_serializer(record).data,

            status=201,

        )

    @extend_schema(

        request=CorrectionInput,

        responses=CorrectionSerializer,

    )

    @action(

        detail=False,

        methods=["post"],

    )

    @transaction.atomic

    def emergency(self, request):

        scope = staff(

            request,

            lock=True,

        )

        if scope.role != "admin":

            raise PermissionDenied(

                "Only Institute Admin can apply an emergency override."

            )

        values = payload(

            CorrectionInput,

            request.data,

        )

        if values["kind"] == "attendance_session":

            raise ValidationError(

                "Choose an individual attendance record."

            )

        obj, offering = target_record(

            scope,

            values["kind"],

            values["target"],

            lock=True,

        )

        original = snapshot(obj)

        proposed = proposal(

            obj,

            values["proposed"],

        )

        if original == proposed:

            raise ValidationError(

                "The proposed correction does not change this record."

            )

        record = CorrectionRequest.objects.create(

            institute=scope.institute,

            offering=offering,

            kind=values["kind"],

            target=obj.pk,

            requester=request.user,

            reviewer=request.user,

            original=original,

            proposed=proposed,

            reason=values["reason"],

            decision_reason=values["reason"],

            status="approved",

            decided_at=timezone.now(),

            emergency=True,

        )

        apply_proposal(

            obj,

            proposed,

        )

        audit_correction(

            scope,

            request.user,

            "Academic.emergency_override",

            obj,

            record,

            extra={

                "emergency": True,

            },

        )

        notify_student_of_correction(

            scope.institute,

            obj,

            record,

        )

        return Response(

            self.get_serializer(record).data,

            status=201,

        )

    @extend_schema(

        request=DecisionInput,

        responses=CorrectionSerializer,

    )

    @action(

        detail=True,

        methods=["post"],

    )

    @transaction.atomic

    def decide(self, request, pk=None):

        scope = staff(

            request,

            lock=True,

        )

        values = payload(

            DecisionInput,

            request.data,

        )

        visible_record = self.get_object()

        record = get_object_or_404(

            CorrectionRequest.objects.select_for_update(),

            pk=visible_record.pk,

            institute=scope.institute,

            offering__in=scope.offerings(),

        )

        if not reviewer(

            scope,

            record.offering,

        ):

            raise PermissionDenied(

                "Only Institute Admin or the course's own "

                "Department Head can review this correction."

            )

        if record.requester_id == request.user.pk:

            raise PermissionDenied(

                "You cannot approve or reject your own correction request."

            )

        if record.status != "pending":

            raise ValidationError(

                "This correction has already been decided."

            )

        obj, offering = target_record(

            scope,

            record.kind,

            record.target,

            lock=True,

        )

        if str(offering.pk) != str(record.offering_id):

            raise ValidationError(

                "The correction request does not match "

                "the academic record's class."

            )

        if values["decision"] == "approved":

            validate_unchanged_record(

                obj,

                record,

            )

            checked = validate_stored_proposal(

                obj,

                record,

            )

            apply_proposal(

                obj,

                checked,

            )

        record.status = values["decision"]

        record.reviewer = request.user

        record.decision_reason = values["reason"]

        record.decided_at = timezone.now()

        record.save(

            update_fields=[

                "status",

                "reviewer",

                "decision_reason",

                "decided_at",

            ]

        )

        if record.status == "rejected":

            audit_action = "Academic.correction_rejected"

        elif isinstance(obj, Submission):

            audit_action = "Submission.grade"

        elif isinstance(obj, Attempt):

            audit_action = "Attempt.grade"

        elif isinstance(obj, ManualGrade):

            audit_action = "ManualGrade.history"

        else:

            audit_action = "Attendance.correction"

        audit_correction(

            scope,

            request.user,

            audit_action,

            obj,

            record,

        )

        notify_event(

            scope.institute,

            [record.requester_id],

            "Correction " + record.status,

            record.decision_reason,

            event_key=(

                f"correction:{record.pk}:decision"

            ),

            destination="/academic-reviews",

        )

        if record.status == "approved":

            notify_student_of_correction(

                scope.institute,

                obj,

                record,

            )

        return Response(

            self.get_serializer(record).data

        )
