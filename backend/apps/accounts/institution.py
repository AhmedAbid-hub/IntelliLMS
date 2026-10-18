"""Shared type rules. Legacy records are retained; new structures follow the type."""
from rest_framework.exceptions import PermissionDenied, ValidationError


def academic_config(institute):
    kind = institute.kind
    return {
        "departments": kind != "school",
        "batches": kind not in ("school", "college"),
        "structure": "annual" if kind in ("school", "college") else "semester",
        "default_duration": {"school": 1, "college": 2}.get(kind, 8),
        "direct_teacher_assignment": kind == "school",
        "legacy_type": kind not in ("school", "college", "university"),
    }


def require_departments(institute):
    if not academic_config(institute)["departments"]:
        raise PermissionDenied("Schools use direct administrator teacher assignments, without departments or Department Heads.")


def validate_structure(institute, model_name, attrs, instance=None):
    """Do not rewrite historical structures when unrelated fields are maintained."""
    config = academic_config(institute)
    if not config["departments"]:
        if model_name == "Unit":
            require_departments(institute)
        for field in ("unit", "eligible_units"):
            if attrs.get(field) and (not instance or attrs[field] != getattr(instance, field, None)):
                raise ValidationError({field: "School records do not use departments."})
    if institute.kind == "school":
        if model_name == "AdmissionBatch" or attrs.get("batch") and (not instance or attrs["batch"] != getattr(instance, "batch", None)):
            raise ValidationError({"batch": "Use a class and section for school placement."})
        if attrs.get("head_correction_review"):
            raise ValidationError({"head_correction_review": "School corrections are reviewed by the Institute Admin."})
    if model_name == "Program":
        if not instance:
            attrs.setdefault("structure", config["structure"])
            attrs.setdefault("duration_terms", config["default_duration"])
        if institute.kind in ("school", "college", "university"):
            if "structure" in attrs and attrs["structure"] != config["structure"] and (not instance or attrs["structure"] != instance.structure):
                raise ValidationError({"structure": "Choose the academic structure supported by this institute type: " + config["structure"] + ". Historical structures remain unchanged."})
        if institute.kind == "school" and (not instance or "duration_terms" in attrs) and attrs.get("duration_terms", 1) != 1:
            raise ValidationError({"duration_terms": "Each school class represents one academic year; promotion moves to another class."})
