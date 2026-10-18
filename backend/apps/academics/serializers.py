from django.db import models
from functools import lru_cache
from django.db.models import Q
from rest_framework import serializers
from apps.accounts.models import Membership
from apps.accounts.scope import Scope
from apps.accounts.institution import academic_config, validate_structure
from .models import (
    AdmissionBatch,
    CurriculumItem,
    Unit,
    Year,
    Term,
    Program,
    Section,
    Course,
    Offering,
    Enrollment,
    Timetable,
    StudentPlacement,
)


class RelatedLabelField(serializers.CharField):
    """A read-only label whose type is also visible to OpenAPI generation."""

    def to_representation(self, obj):
        return getattr(obj, "name", None) or getattr(obj, "title", None) or getattr(obj, "username", None)


class TenantSerializer(serializers.ModelSerializer):
    def get_fields(self):
        fields = super().get_fields()
        if self.Meta.model in [Program, Course, Section, AdmissionBatch, CurriculumItem]:
            fields["active"] = serializers.BooleanField(required=False, default=True)
        if self.Meta.model == CurriculumItem:
            fields["required"] = serializers.BooleanField(required=False, default=True)
        if self.Meta.model == Offering:
            fields["assignment_reason"] = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=1000)
        for name in ["course", "term", "section", "program", "unit", "year", "offering", "student", "batch"]:
            if name in fields:
                fields[name + "_label"] = RelatedLabelField(source=name, read_only=True, allow_null=True)
        return fields

    def validate(self, attrs):
        scope = Scope(self.context["request"])
        # Platform invitations target the institute authorized by the view,
        # which need not be the platform user's currently selected institute.
        institute = scope.institute
        if self.Meta.model == Membership and scope.role == "superadmin":
            institute = self.context.get("membership_institute") or getattr(self.instance, "institute", None)
        if institute is None:
            raise serializers.ValidationError("Select an active institute.")

        def value(key, default=None):
            return attrs.get(key, getattr(self.instance, key, default))

        for key, related in attrs.items():
            values = related if isinstance(related, list) else [related]
            for item in values:
                if (
                    hasattr(item, "institute_id")
                    and item.institute_id != institute.id
                ):
                    raise serializers.ValidationError(
                        {key: "Related record must belong to the selected institute."}
                    )
        offering = value("offering")
        if offering:
            scope.check_offering(offering, write=True)
        model = self.Meta.model
        validate_structure(institute, model.__name__, attrs, self.instance)
        if model in [AdmissionBatch, CurriculumItem, Section]:
            program = value("program")
            if not self.instance and not program.active:
                raise serializers.ValidationError({"program": "Choose an active program."})
        if model == Section and value("batch") and value("batch").program_id != value("program").pk:
            raise serializers.ValidationError({"batch": "Batch must belong to the selected program."})
        if model == CurriculumItem:
            if value("stage") > value("program").duration_terms:
                raise serializers.ValidationError({"stage": "Stage exceeds the program duration."})
            if not self.instance and not value("course").active:
                raise serializers.ValidationError({"course": "Choose an active subject."})
        if model == Program and self.instance and "duration_terms" in attrs:
            if self.instance.curriculumitem_set.filter(stage__gt=value("duration_terms")).exists() or StudentPlacement.objects.filter(program=self.instance, stage__gt=value("duration_terms")).exists():
                raise serializers.ValidationError({"duration_terms": "Existing curriculum stages exceed this duration. Preserve the duration or create a new program."})
        if model == Program and self.instance and "structure" in attrs and attrs["structure"] != self.instance.structure:
            if (self.instance.curriculumitem_set.exists() or StudentPlacement.objects.filter(program=self.instance).exists()
                    or Offering.objects.filter(section__program=self.instance).exists()):
                raise serializers.ValidationError({"structure": "Preserve the academic structure of programs with curriculum, placements or offerings. Create a new program instead."})
        if model == Offering and not self.instance:
            if not value("course").active or value("term").status == "closed":
                raise serializers.ValidationError("New offerings require an active subject and a non-closed term.")
            if value("section") and (not value("section").active or not value("section").program.active):
                raise serializers.ValidationError("New offerings require an active section and program.")
            if value("section") and value("term").period_type and value("section").program.structure != value("term").period_type:
                raise serializers.ValidationError({"term": "Period type must match the section's program structure."})
        if model == Offering:
            reason = attrs.pop("assignment_reason", "").strip()
            self.assignment_reason = reason
            if "teachers" in attrs:
                previous = set(self.instance.teachers.values_list("pk", flat=True)) if self.instance else set()
                changed = previous != {teacher.pk for teacher in attrs["teachers"]}
                if changed and self.instance and self.instance.archived:
                    raise serializers.ValidationError("Unarchive the course before changing teaching assignments.")
                if changed and scope.role == "admin" and not academic_config(scope.institute)["direct_teacher_assignment"] and not self.context.get("lifecycle_reassignment") and len(reason) < 5:
                    raise serializers.ValidationError({"assignment_reason": "Department Heads own teacher assignments. An administrative override requires a reason of at least five characters."})
        if (
            model == Program
            and Program.objects.filter(
                institute=scope.institute, unit=value("unit"), name=value("name")
            )
            .exclude(pk=getattr(self.instance, "pk", None))
            .exists()
        ):
            raise serializers.ValidationError(
                {
                    "name": "A program with this name already exists in this academic unit."
                }
            )
        if model in [Unit, Program, Course] and scope.role == "head":
            unit_id = (
                getattr(value("unit"), "pk", None)
                if model != Unit
                else getattr(self.instance, "pk", None)
            )
            if unit_id != scope.membership.unit_id:
                raise serializers.ValidationError(
                    "Academic unit is outside your department."
                )
        if model == Term:
            expected_type = academic_config(scope.institute)["structure"]
            if not self.instance:
                attrs.setdefault("period_type", expected_type)
            if "period_type" in attrs and attrs["period_type"] != expected_type and (not self.instance or attrs["period_type"] != self.instance.period_type):
                raise serializers.ValidationError({"period_type": "Period type must match this institute's academic structure."})
            if self.instance and "period_type" in attrs and attrs["period_type"] != self.instance.period_type and (self.instance.offering_set.exists() or StudentPlacement.objects.filter(term=self.instance).exists()):
                raise serializers.ValidationError({"period_type": "Preserve the type of periods with existing offerings."})
        if model in [Year, Term]:
            if value("start") > value("end"):
                raise serializers.ValidationError("End date must follow start date.")
            if model == Term and not (
                value("year").start
                <= value("start")
                <= value("end")
                <= value("year").end
            ):
                raise serializers.ValidationError(
                    "Term must lie within its academic year."
                )
            if (
                model == Year
                and self.instance
                and self.instance.term_set.filter(
                    Q(start__lt=value("start")) | Q(end__gt=value("end"))
                ).exists()
            ):
                raise serializers.ValidationError(
                    "Existing terms must remain within the academic year."
                )
            if model == Term and self.instance and {"start", "end"} & attrs.keys():
                from apps.learning.models import AttendanceSession
                if AttendanceSession.objects.filter(offering__term=self.instance).filter(
                    Q(date__lt=value("start")) | Q(date__gt=value("end"))
                ).exists():
                    raise serializers.ValidationError("Existing attendance sessions must remain within their academic period.")
                for meeting in Timetable.objects.filter(
                    offering__term=self.instance
                ).select_related("offering"):
                    conflicts = Timetable.objects.filter(
                        institute=scope.institute,
                        day=meeting.day,
                        start__lt=meeting.end,
                        end__gt=meeting.start,
                        offering__term__start__lte=value("end"),
                        offering__term__end__gte=value("start"),
                    ).exclude(offering__term=self.instance)
                    if conflicts.filter(
                        Q(location__iexact=meeting.location)
                        | Q(offering__teachers__in=meeting.offering.teachers.all())
                    ).exists():
                        raise serializers.ValidationError(
                            "These term dates create a room or instructor timetable conflict."
                        )
        if model == Unit and value("parent"):
            parent = value("parent")
            seen = {self.instance.pk} if self.instance else set()
            while parent:
                if parent.pk in seen:
                    raise serializers.ValidationError(
                        "Academic unit hierarchy cannot contain cycles."
                    )
                seen.add(parent.pk)
                parent = parent.parent
        if model == Offering:
            if (
                value("assignment_weight", 60)
                + value("quiz_weight", 40)
                + value("manual_weight", 0)
                != 100
            ):
                raise serializers.ValidationError("Assessment weights must total 100.")
            course = value("course")
            if (
                value("section")
                and value("section").program.unit_id
                and course.unit_id
                and value("section").program.unit_id != course.unit_id
            ):
                raise serializers.ValidationError(
                    "Section and course must belong to the same academic unit."
                )
            if scope.role == "head" and course.unit_id != scope.membership.unit_id:
                raise serializers.ValidationError(
                    "Course belongs to another department."
                )
            for teacher in attrs.get("teachers", []):
                memberships = Membership.objects.filter(
                    user=teacher, institute=scope.institute, active=True, user__is_active=True
                ).filter(Q(role="teacher") | Q(role="head", can_teach=True))
                if scope.institute.kind == "school":
                    memberships = memberships.filter(role="teacher")
                if scope.role == "head":
                    memberships = memberships.filter(appointments__unit_id=scope.membership.unit_id, appointments__active=True)
                if not memberships.exists():
                    raise serializers.ValidationError(
                        {"teachers": "Select active teachers in the permitted scope."}
                    )
            if self.instance and "teachers" in attrs:
                for meeting in Timetable.objects.filter(offering=self.instance):
                    if (
                        Timetable.objects.filter(
                            institute=scope.institute,
                            day=meeting.day,
                            start__lt=meeting.end,
                            end__gt=meeting.start,
                            offering__term__start__lte=value("term").end,
                            offering__term__end__gte=value("term").start,
                            offering__teachers__in=attrs["teachers"],
                        )
                        .exclude(offering=self.instance)
                        .exists()
                    ):
                        raise serializers.ValidationError(
                            {
                                "teachers": "An instructor has a conflicting timetable in an overlapping term."
                            }
                        )
        if model == Enrollment:
            if not Membership.objects.filter(
                user=value("student"),
                institute=scope.institute,
                active=True,
                role="student",
            ).exists():
                raise serializers.ValidationError(
                    {"student": "Active student membership required."}
                )
            if (
                scope.role == "head"
                and not scope.people().filter(user=value("student")).exists()
            ):
                raise serializers.ValidationError(
                    "Student belongs to another department."
                )
        if model == Timetable:
            if value("start") >= value("end"):
                raise serializers.ValidationError("End time must follow start time.")
            meetings = Timetable.objects.filter(
                institute=scope.institute,
                day=value("day"),
                start__lt=value("end"),
                end__gt=value("start"),
                offering__term__start__lte=offering.term.end,
                offering__term__end__gte=offering.term.start,
            ).exclude(pk=getattr(self.instance, "pk", None))
            if meetings.filter(
                Q(location__iexact=value("location"))
                | Q(offering__teachers__in=offering.teachers.all())
                | Q(offering=offering)
            ).exists():
                raise serializers.ValidationError(
                    "Room, instructor, or course schedule conflict."
                )
        return attrs

@lru_cache(maxsize=None)
def serializer_for(model, base=TenantSerializer, readonly=()):
    meta = type(
        "Meta",
        (),
        {
            "model": model,
            "fields": "__all__",
            "read_only_fields": ("id", "institute", "created_at", *readonly),
        },
    )
    return type(model.__name__ + "Serializer", (base,), {"Meta": meta})
