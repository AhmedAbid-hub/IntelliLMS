"""Validated custom-action payloads, also used to generate OpenAPI contracts."""

from rest_framework import serializers


class StrictText(serializers.CharField):
    def to_internal_value(self, data):
        if not isinstance(data, str):
            self.fail("invalid")
        return super().to_internal_value(data)


class StrictBoolean(serializers.BooleanField):
    def to_internal_value(self, data):
        if not isinstance(data, bool):
            self.fail("invalid", input=data)
        return data


class SubmissionGradeInput(serializers.Serializer):
    marks = serializers.DecimalField(max_digits=7, decimal_places=2, min_value=0)
    feedback = StrictText(
        required=False,
        default="",
        allow_blank=True,
        max_length=10000,
        trim_whitespace=False,
    )
    released = StrictBoolean(required=False, default=False)


class AssignmentSubmitInput(serializers.Serializer):
    text = StrictText(
        required=False,
        default="",
        allow_blank=True,
        max_length=100000,
        trim_whitespace=False,
    )
    file = serializers.FileField(required=False)


class AnswersInput(serializers.Serializer):
    answers = serializers.DictField(
        child=StrictText(allow_blank=True, max_length=10000, trim_whitespace=False),
        required=False,
        default=dict,
    )


class AttemptGradeInput(serializers.Serializer):
    manual_marks = serializers.DictField(
        child=serializers.DecimalField(max_digits=7, decimal_places=2, min_value=0),
        required=False,
        default=dict,
    )


class AttendanceRecord(serializers.Serializer):
    student = serializers.UUIDField()
    status = serializers.ChoiceField(choices=["present", "absent", "late", "excused"])


class AttendanceInput(serializers.Serializer):
    records = AttendanceRecord(many=True, allow_empty=False, max_length=500)


class AttendanceResult(serializers.Serializer):
    updated = serializers.IntegerField(min_value=1, max_value=500)


class BankCopyInput(serializers.Serializer):
    quiz = serializers.UUIDField()


class AttemptResult(serializers.Serializer):
    id = serializers.UUIDField()
    quiz = serializers.UUIDField()
    student = serializers.UUIDField()
    student_label = serializers.CharField()
    started_at = serializers.DateTimeField()
    deadline = serializers.DateTimeField()
    submitted_at = serializers.DateTimeField(allow_null=True)
    answers = serializers.DictField(child=serializers.CharField(allow_blank=True))
    marks = serializers.FloatField(allow_null=True)
    manual_marks = serializers.DictField(child=serializers.FloatField())
    released = serializers.BooleanField()
    expired = serializers.BooleanField(required=False)


class CompletionResult(serializers.Serializer):
    completed = serializers.BooleanField()
    created_at = serializers.DateTimeField()


class ReadResult(serializers.Serializer):
    read = serializers.BooleanField()


class GradeHistoryEvent(serializers.Serializer):
    id = serializers.UUIDField()
    created_at = serializers.DateTimeField()
    actor = serializers.CharField()
    action = serializers.CharField()
    detail = serializers.JSONField(help_text="Assessment-specific previous and current marks, release state and feedback.")


def payload(serializer_class, data):
    serializer = serializer_class(data=data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data
