"""Accounts institute validation API; extracted without changing behavior."""
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from ..configuration import validate_grading_rules, validate_terminology
from ..models import Institute


class InstituteSerializer(serializers.ModelSerializer):

    policy_change_reason = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=1000)

    def validate_kind(self, value):

        if self.instance and value != self.instance.kind:

            raise ValidationError("Changing an established institute type requires a reviewed data migration; existing records are preserved.")

        if not self.instance and value not in ("school", "college", "university"):

            raise ValidationError("Choose school, college or university.")

        return value

    def validate_grading_rules(self, value):

        kind = self.instance.kind if self.instance else self.initial_data.get("kind")

        if isinstance(value, dict) and value.get("gpa_policy") and kind != "university":

            raise ValidationError("GPA calculations are available for explicitly configured university policies.")

        return validate_grading_rules(value)

    def validate_terminology(self, value):

        return validate_terminology(value)

    class Meta:

        model = Institute

        fields = "__all__"
