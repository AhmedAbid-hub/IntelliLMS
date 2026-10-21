"""Accounts membership validation API; extracted without changing behavior."""
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.academics.serializers import TenantSerializer
from ..invitations import invitation_status, InvitationStatus
from ..models import Membership
from ..scope import Scope
from ..institution import validate_structure


class MembershipSerializer(TenantSerializer):

    invitation = serializers.SerializerMethodField()

    @extend_schema_field(InvitationStatus)

    def get_invitation(self, obj):

        return invitation_status(obj.user, fresh=False)

    avatar_url = serializers.SerializerMethodField()

    @extend_schema_field(

        serializers.CharField(allow_null=True)

    )

    def get_avatar_url(self, obj):

        if not obj.user.avatar:

            return None

        filename = obj.user.avatar.name.rsplit("/", 1)[-1]

        return (

            f"/api/v1/memberships/{obj.pk}/avatar/"

            f"?v={filename}"

        )

    username = serializers.CharField(

        source="user.username",

        read_only=True,

    )

    first_name = serializers.CharField(

        source="user.first_name",

        read_only=True,

    )

    last_name = serializers.CharField(

        source="user.last_name",

        read_only=True,

    )

    email = serializers.EmailField(

        source="user.email",

        read_only=True,

    )

    class Meta:

        model = Membership

        fields = "__all__"

        read_only_fields = [

            "institute",

            "user",

            "removed_at",

            "can_teach",

        ]

        validators = []

    def validate(self, attrs):

        attrs = super().validate(attrs)

        request = self.context["request"]

        is_platform_admin = request.user.is_superuser

        scope = None if is_platform_admin else Scope(request)

        instance = self.instance

        role = attrs.get(

            "role",

            getattr(instance, "role", None),

        )

        if scope:

            validate_structure(scope.institute, "Membership", attrs, instance)

            if scope.institute.kind == "school" and role == "head" and not instance:

                raise ValidationError({"role": "Schools do not have Department Heads."})

        if is_platform_admin and role != "admin":

            raise PermissionDenied(

                "Platform access manages Institute Admin memberships only."

            )

        identifier = attrs.get(

            "student_identifier",

            getattr(instance, "student_identifier", ""),

        )

        if identifier:

            duplicate = (

                Membership.objects.filter(

                    institute=(self.context.get("membership_institute") or getattr(instance, "institute", None)) if is_platform_admin else scope.institute,

                    student_identifier=identifier,

                )

                .exclude(pk=getattr(instance, "pk", None))

                .exists()

            )

            if duplicate:

                raise ValidationError({

                    "student_identifier":

                        "This student ID already exists in this institute."

                })

        if instance:

            if (

                instance.role == "student"

                and "section" in attrs

                and attrs["section"] != instance.section

            ):

                raise ValidationError(

                    "Use Student placement transfer to preserve "

                    "academic history."

                )

            lifecycle_fields = [

                "role",

                "active",

                "unit",

                "can_teach",

                "removed_at",

            ]

            for name in lifecycle_fields:

                if (

                    name in attrs

                    and attrs[name] != getattr(instance, name)

                ):

                    raise ValidationError(

                        "Use the membership lifecycle action to "

                        "review consequences and record a reason."

                    )

        elif role == "admin" and not is_platform_admin:

            raise PermissionDenied(

                "Only Super Admin can appoint Institute Admins."

            )

        unit = attrs.get(

            "unit",

            getattr(instance, "unit", None),

        )

        section = attrs.get("section")

        if section:

            expected_unit_id = getattr(unit, "pk", None)

            if section.program.unit_id != expected_unit_id:

                raise ValidationError({

                    "section":

                        "Section must match the membership department."

                })

        eligible_units = attrs.get("eligible_units")

        if eligible_units and role not in ["teacher", "head"]:

            raise ValidationError({

                "eligible_units":

                    "Teaching eligibility applies to teachers "

                    "or teaching heads only."

            })

        if eligible_units is not None and len(eligible_units) > 50:

            raise ValidationError({

                "eligible_units":

                    "Select at most 50 eligible departments."

            })

        if instance and eligible_units is not None:

            allowed = {

                value.pk

                for value in eligible_units

            }

            if unit is not None:

                allowed.add(unit.pk)

            active_outside_allowed = (

                instance.appointments.filter(active=True)

                .exclude(unit_id__in=allowed)

                .exists()

            )

            if active_outside_allowed:

                raise ValidationError(

                    "End affected departmental appointments before "

                    "removing teaching eligibility."

                )

        if role == "head" and not unit:

            raise ValidationError({

                "unit":

                    "Department heads require an academic unit."

            })

        membership_active = attrs.get(

            "active",

            getattr(instance, "active", True),

        )

        if role == "head" and membership_active:

            existing_head = (

                Membership.objects.filter(

                    institute=(instance.institute if is_platform_admin and instance else scope.institute),

                    unit=unit,

                    role="head",

                    active=True,

                )

                .exclude(pk=getattr(instance, "pk", None))

                .exists()

            )

            if existing_head:

                raise ValidationError(

                    "Use Replace Department Head to change "

                    "existing department leadership."

                )

        return attrs
