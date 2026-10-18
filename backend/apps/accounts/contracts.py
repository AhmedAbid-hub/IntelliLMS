from rest_framework import serializers
from .models import Membership


class Text(serializers.CharField):
    def to_internal_value(self, data):
        if not isinstance(data, str):
            self.fail("invalid")
        return super().to_internal_value(data)


class LoginInput(serializers.Serializer):
    username = Text(max_length=150)
    password = Text(max_length=4096, trim_whitespace=False, write_only=True)


class ProfileInput(serializers.Serializer):
    notify_academic = serializers.BooleanField(required=False)
    first_name = Text(
        max_length=150, required=False, allow_blank=True, trim_whitespace=False
    )
    last_name = Text(
        max_length=150, required=False, allow_blank=True, trim_whitespace=False
    )


class SelectInstituteInput(serializers.Serializer):
    institute_id = serializers.UUIDField()


class SelectWorkspaceInput(serializers.Serializer):
    academic_workspace = serializers.ChoiceField(choices=["department", "teaching"])


class PasswordChangeInput(serializers.Serializer):
    old_password = Text(max_length=4096, trim_whitespace=False, write_only=True)
    new_password = Text(max_length=4096, trim_whitespace=False, write_only=True)


class PasswordResetInput(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class PasswordConfirmInput(serializers.Serializer):
    uid = Text(max_length=100)
    token = Text(max_length=500)
    new_password = Text(max_length=4096, trim_whitespace=False, write_only=True)


class DetailResult(serializers.Serializer):
    detail = serializers.CharField()


class IdentityMembership(serializers.Serializer):
    institute_id = serializers.UUIDField()
    institute__name = serializers.CharField()
    role = serializers.ChoiceField(choices=Membership.ROLES)
    unit_id = serializers.UUIDField(allow_null=True)
    can_teach = serializers.BooleanField()


class InstituteProfile(serializers.Serializer):
    academic_config = serializers.DictField()
    name = serializers.CharField()
    kind = serializers.CharField()
    terminology = serializers.DictField(child=serializers.CharField())
    grading_rules = serializers.JSONField()


class IdentityResult(serializers.Serializer):
    academic_workspace = serializers.ChoiceField(choices=["department", "teaching"])
    avatar_url = serializers.CharField(allow_null=True)
    notify_academic = serializers.BooleanField()
    id = serializers.UUIDField()
    username = serializers.CharField()
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)
    email = serializers.EmailField()
    is_superuser = serializers.BooleanField()
    institute_id = serializers.UUIDField(allow_null=True)
    institute_profile = InstituteProfile(allow_null=True)
    memberships = IdentityMembership(many=True)


class MembershipInput(serializers.Serializer):
    eligible_units = serializers.ListField(child=serializers.UUIDField(), required=False, max_length=50)
    role = serializers.ChoiceField(choices=Membership.ROLES)
    unit = serializers.UUIDField(required=False, allow_null=True)
    active = serializers.BooleanField(required=False, default=True)
    display_name = Text(max_length=150, required=False, allow_blank=True)
    student_identifier = Text(max_length=64, required=False, allow_blank=True)
    section = serializers.UUIDField(required=False, allow_null=True)


class InvitationInput(MembershipInput):
    last_name = Text(max_length=150, allow_blank=True, required=False, default="")
    username = Text(max_length=150)
    email = serializers.EmailField(max_length=254)
    first_name = Text(max_length=150, allow_blank=True, required=False, default="")


class AttachInput(MembershipInput):
    user = serializers.UUIDField()


class CsvImportInput(serializers.Serializer):
    preview = serializers.BooleanField(default=False)
    file = serializers.FileField(
        help_text="UTF-8 CSV, at most 1 MB and 500 rows; username,email,role headers required."
    )


class CsvRowError(serializers.Serializer):
    line = serializers.IntegerField()
    username = serializers.CharField(allow_blank=True)
    detail = serializers.CharField()


class CsvImportResult(serializers.Serializer):
    created = serializers.IntegerField()
    errors = CsvRowError(many=True)
    preview = serializers.ListField(child=serializers.DictField(), required=False)
    would_create = serializers.IntegerField(required=False)


def payload(serializer_class, data):
    value = serializer_class(data=data)
    value.is_valid(raise_exception=True)
    return value.validated_data
