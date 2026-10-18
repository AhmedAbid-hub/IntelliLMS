"""Institute staff transitions. Institute row locks serialize leadership changes."""
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.academics.models import Offering
from apps.academics.serializers import serializer_for
from apps.insights.models import Audit
from .models import Institute, Membership
from .scope import Scope
from .institution import academic_config


class TransitionInput(serializers.Serializer):
    operation = serializers.ChoiceField(choices=["deactivate", "remove", "reactivate", "change_role"])
    reason = serializers.CharField(min_length=5, max_length=1000)
    role = serializers.ChoiceField(choices=Membership.ROLES, required=False)
    unit = serializers.UUIDField(required=False, allow_null=True)
    replacement = serializers.UUIDField(required=False, allow_null=True)
    can_teach = serializers.BooleanField(required=False)


class ReplaceHeadInput(serializers.Serializer):
    replacement = serializers.UUIDField()
    outgoing_action = serializers.ChoiceField(choices=["teacher", "deactivate", "remove"])
    reason = serializers.CharField(min_length=5, max_length=1000)


class ImpactCourse(serializers.Serializer):
    id = serializers.UUIDField()
    title = serializers.CharField()


class ImpactResult(serializers.Serializer):
    active_assignments = serializers.IntegerField()
    courses = ImpactCourse(many=True)
    preview_limit = serializers.IntegerField()
    active_enrollments = serializers.IntegerField()
    history_preserved = serializers.BooleanField()


def snapshot(member):
    return {"role": member.role, "unit": str(member.unit_id) if member.unit_id else None,
            "active": member.active, "removed_at": member.removed_at.isoformat() if member.removed_at else None,
            "can_teach": member.can_teach}


def authorize(scope, member, next_role=None):
    scope.require("admin")
    if scope.role == "superadmin" and (member.role != "admin" or next_role not in [None, "admin"]):
        raise PermissionDenied("Platform access manages Institute Admin memberships only.")
    if member.user_id == scope.user.pk:
        raise ValidationError("You cannot change your own membership.")
    if member.user.is_superuser:
        raise PermissionDenied("Platform accounts must be managed through platform administration.")
    if (member.role == "admin" or next_role == "admin") and scope.role != "superadmin":
        raise PermissionDenied("Only Super Admin can appoint or replace Institute Admins.")


def check_last_admin(member, next_role, active):
    if member.role == "admin" and member.active and (next_role != "admin" or not active):
        if not Membership.objects.filter(institute=member.institute, role="admin", active=True, user__is_active=True).exclude(pk=member.pk).exists():
            raise ValidationError("Appoint another active Institute Admin before removing the last administrator.")


def reassign(request, member, replacement_id):
    courses = list(Offering.objects.filter(institute=member.institute, teachers=member.user, archived=False).exclude(term__status="closed").select_related("course", "term"))
    if not courses:
        return []
    if not replacement_id:
        raise ValidationError({"replacement": "Select an eligible replacement for active course assignments before revoking access."})
    replacement = Membership.objects.filter(pk=replacement_id, institute=member.institute, active=True, removed_at__isnull=True, user__is_active=True).select_related("user").first()
    if not replacement or replacement.pk == member.pk or not (replacement.role == "teacher" or (replacement.role == "head" and replacement.can_teach)):
        raise ValidationError({"replacement": "Select another active teacher or teaching head in this institute."})
    if member.institute.kind == "school" and replacement.role != "teacher":
        raise ValidationError({"replacement": "School assignments require an active teacher."})
    # Validate every course before writing any: includes existing timetable conflicts.
    for course in courses:
        if academic_config(member.institute)["departments"] and course.course.unit_id:
            appointments = replacement.appointments.filter(unit_id=course.course.unit_id)
            if appointments.filter(active=False).exists() or (replacement.unit_id != course.course.unit_id and not appointments.filter(active=True).exists()):
                raise ValidationError({"replacement": "Replacement must have a current appointment or authorized primary department for each affected course."})
        teachers = list(course.teachers.exclude(pk=member.user_id).values_list("pk", flat=True))
        teachers.append(replacement.user_id)
        serializer = serializer_for(Offering)(course, data={"teachers": [str(x) for x in set(teachers)]}, partial=True, context={"request": request, "lifecycle_reassignment": True})
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return [str(course.pk) for course in courses]


@transaction.atomic
def transition(request, member_id, values):
    scope = Scope(request)
    scope.require("admin")
    Institute.objects.select_for_update().get(pk=scope.institute.pk)
    member = Membership.objects.select_for_update().select_related("user").get(pk=member_id, institute=scope.institute)
    from .institution import require_departments, validate_structure
    role = values.get("role", member.role)
    if values["operation"] in ("change_role", "reactivate"):
        if role == "head":
            require_departments(scope.institute)
        validate_structure(scope.institute, "Membership", values, member)
    authorize(scope, member, role)
    operation = values["operation"]
    if operation != "change_role" and {"role", "unit", "can_teach"} & values.keys():
        raise ValidationError("Role and department changes require the change-role operation.")
    if operation == "change_role" and "role" not in values:
        raise ValidationError({"role": "Select a role."})
    active = operation not in ["deactivate", "remove"] if operation != "change_role" else member.active
    if operation == "reactivate" and not member.user.is_active:
        raise ValidationError("The global account is disabled; a platform administrator must reactivate it first.")
    if operation == "change_role" and (member.role == "student") != (role == "student"):
        raise ValidationError("Student/staff conversion is not supported while preserving separate academic identities.")
    check_last_admin(member, role, active)
    before = snapshot(member)
    next_unit = values.get("unit", member.unit_id)
    if next_unit:
        from apps.academics.models import Unit
        if not Unit.objects.filter(pk=next_unit, institute=scope.institute).exists():
            raise ValidationError({"unit": "Choose a department in this institute."})
    if role == "head" and not next_unit:
        raise ValidationError({"unit": "Department heads need a department."})
    if active and role == "head" and Membership.objects.filter(institute=scope.institute, unit_id=next_unit, role="head", active=True).exclude(pk=member.pk).exists():
        raise ValidationError("Use Replace Department Head to review and replace the current leadership assignment.")
    remains_teacher = role == "teacher" or (role == "head" and values.get("can_teach", member.can_teach))
    reassigned = reassign(request, member, values.get("replacement")) if not active or not remains_teacher or next_unit != member.unit_id else []
    member.role, member.unit_id, member.active = role, next_unit, active
    member.can_teach = role == "head" and values.get("can_teach", member.can_teach)
    member.removed_at = timezone.now() if operation == "remove" else None if operation == "reactivate" else member.removed_at
    member.save()
    if not active:
        member.appointments.filter(active=True).update(active=False, updated_at=timezone.now())
    if not active and role == "student":
        member.user.enrollment_set.filter(institute=scope.institute, active=True).update(active=False)
    Audit.objects.create(institute=scope.institute, actor=request.user, action="Membership." + operation, object_id=str(member.pk), detail={"reason": values["reason"], "previous": before, "current": snapshot(member), "reassigned_courses": reassigned, "replacement": str(values.get("replacement") or "")})
    return member


@transaction.atomic
def replace_head(request, member_id, values):
    scope = Scope(request)
    scope.require("admin")
    Institute.objects.select_for_update().get(pk=scope.institute.pk)
    from .institution import require_departments
    require_departments(scope.institute)
    old = Membership.objects.select_for_update().select_related("user").get(pk=member_id, institute=scope.institute)
    authorize(scope, old)
    if old.role != "head" or not old.active:
        raise ValidationError("Select an active Department Head.")
    replacement = Membership.objects.select_for_update().filter(pk=values["replacement"], institute=scope.institute, unit=old.unit, role="teacher", active=True, user__is_active=True).first()
    if not replacement or replacement.pk == old.pk:
        raise ValidationError("Replacement must be an active teacher in the same department.")
    before = {str(old.pk): snapshot(old), str(replacement.pk): snapshot(replacement)}
    outgoing = values["outgoing_action"]
    courses = reassign(request, old, replacement.pk) if outgoing != "teacher" else []
    old.role = "teacher"
    old.can_teach = False
    old.active = outgoing == "teacher"
    old.removed_at = timezone.now() if outgoing == "remove" else None
    old.save()
    if not old.active:
        old.appointments.filter(active=True).update(active=False, updated_at=timezone.now())
    replacement.role, replacement.can_teach = "head", True
    replacement.save()
    Audit.objects.create(institute=scope.institute, actor=request.user, action="Membership.replace_head", object_id=str(old.unit_id), detail={"reason": values["reason"], "previous": before, "current": {str(old.pk): snapshot(old), str(replacement.pk): snapshot(replacement)}, "reassigned_courses": courses})
    return replacement
