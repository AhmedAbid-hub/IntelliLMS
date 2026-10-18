"""Validated institute configuration shared by settings and reporting."""

import math

from rest_framework.exceptions import ValidationError


TERMS = {
    "unit",
    "year",
    "term",
    "program",
    "section",
    "course",
    "offering",
}

TERMINOLOGY_KEYS = TERMS | {
    f"{key}_plural" for key in TERMS
}

GRADING_RULE_KEYS = {
    "gpa_policy",
    "pass_mark",
    "progression_policy",
    "bands",
    "quiz_attempt_policy",
    "missing_category_policy",
    "lock_released_grades",
    "attendance_edit_window_days",
}

QUIZ_ATTEMPT_POLICIES = {
    "mean",
    "best",
    "latest",
}

MISSING_CATEGORY_POLICIES = {
    "normalize",
    "zero",
}

MAX_GRADE_BANDS = 20
MAX_GRADE_LABEL_LENGTH = 12
MAX_TERMINOLOGY_LABEL_LENGTH = 50


def number(value, lower, upper):
    """
    Return True only for finite numeric values within the given range.

    Boolean values are deliberately rejected because Python treats bool
    as a subclass of int.
    """
    return (
        not isinstance(value, bool)
        and isinstance(value, (int, float))
        and math.isfinite(value)
        and lower <= value <= upper
    )


def validate_terminology(value):
    """
    Validate configurable academic terminology.

    Institutes may customize singular and plural labels without changing
    the underlying academic data model.
    """
    if not isinstance(value, dict):
        raise ValidationError(
            "Academic terminology must be an object of supported labels."
        )

    unsupported = set(value) - TERMINOLOGY_KEYS

    if unsupported:
        raise ValidationError(
            "Use supported academic label keys only."
        )

    cleaned = {}

    for key, label in value.items():
        if not isinstance(label, str):
            raise ValidationError(
                "Academic labels must be text."
            )

        label = label.strip()

        if not label:
            raise ValidationError(
                "Academic labels cannot be empty."
            )

        if len(label) > MAX_TERMINOLOGY_LABEL_LENGTH:
            raise ValidationError(
                "Academic labels must be 50 characters or fewer."
            )

        cleaned[key] = label

    return cleaned


def validate_grading_rules(value):
    """
    Validate an institute's grading and assessment policies.

    Supported structure:

    {
        "pass_mark": 50,
        "quiz_attempt_policy": "mean",
        "missing_category_policy": "normalize",
        "bands": [
            {"label": "A", "minimum": 80, "points": 4.0},
            {"label": "B", "minimum": 70, "points": 3.0},
            {"label": "C", "minimum": 60, "points": 2.0},
            {"label": "F", "minimum": 0, "points": 0.0}
        ]
    }

    Empty bands are allowed because letter grades are optional.
    """

    if not isinstance(value, dict):
        raise ValidationError(
            "Grading rules must be an object."
        )

    unsupported = set(value) - GRADING_RULE_KEYS

    if unsupported:
        raise ValidationError(
            "Unsupported grading rule. Use pass_mark, bands and "
            "assessment policies."
        )

    if value.get("progression_policy", "manual_review") not in ("manual_review", "all_required_pass"):
        raise ValidationError("Choose manual_review or all_required_pass for progression_policy.")

    if "lock_released_grades" in value and not isinstance(value["lock_released_grades"], bool):
        raise ValidationError("Released-grade protection must be true or false.")
    days = value.get("attendance_edit_window_days")
    if days is not None and (isinstance(days, bool) or not isinstance(days, int) or not 0 <= days <= 365):
        raise ValidationError("Attendance editing window must be a whole number from 0 to 365 days, or null for no time limit.")

    pass_mark = value.get("pass_mark", 50)

    if not number(pass_mark, 0, 100):
        raise ValidationError(
            "Pass mark must be between 0 and 100."
        )

    quiz_attempt_policy = value.get(
        "quiz_attempt_policy",
        "mean",
    )

    if quiz_attempt_policy not in QUIZ_ATTEMPT_POLICIES:
        raise ValidationError(
            "Quiz attempt policy must be mean, best or latest."
        )

    missing_category_policy = value.get(
        "missing_category_policy",
        "normalize",
    )

    if missing_category_policy not in MISSING_CATEGORY_POLICIES:
        raise ValidationError(
            "Missing category policy must be normalize or zero."
        )

    bands = value.get("bands", [])

    if not isinstance(bands, list):
        raise ValidationError(
            "Grade bands must be a list."
        )

    if len(bands) > MAX_GRADE_BANDS:
        raise ValidationError(
            "Supply up to 20 grade bands."
        )

    previous_minimum = 101
    previous_points = None
    labels = set()
    cleaned_bands = []

    for index, band in enumerate(bands):
        if not isinstance(band, dict):
            raise ValidationError(
                f"Grade band {index + 1} must be an object."
            )

        if set(band) != {
            "label",
            "minimum",
            "points",
        }:
            raise ValidationError(
                "Each band needs label, minimum and points."
            )

        raw_label = band["label"]

        if not isinstance(raw_label, str):
            raise ValidationError(
                "Grade labels must be text."
            )

        label = raw_label.strip()

        if not label:
            raise ValidationError(
                "Grade labels cannot be empty."
            )

        if len(label) > MAX_GRADE_LABEL_LENGTH:
            raise ValidationError(
                "Grade labels must be 12 characters or fewer."
            )

        normalized_label = label.casefold()

        if normalized_label in labels:
            raise ValidationError(
                f"Duplicate grade label: {label}."
            )

        labels.add(normalized_label)

        minimum = band["minimum"]
        points = band["points"]

        if not number(minimum, 0, 100):
            raise ValidationError(
                f"Grade band '{label}' must have a minimum "
                "between 0 and 100."
            )

        if minimum >= previous_minimum:
            raise ValidationError(
                "Grade band minimums must be unique and "
                "ordered from highest to lowest."
            )

        if not number(points, 0, 10):
            raise ValidationError(
                f"Grade band '{label}' must have points "
                "between 0 and 10."
            )

        if (
            previous_points is not None
            and points > previous_points
        ):
            raise ValidationError(
                "Grade points cannot increase as grade "
                "minimums decrease."
            )

        cleaned_bands.append(
            {
                "label": label,
                "minimum": minimum,
                "points": points,
            }
        )

        previous_minimum = minimum
        previous_points = points

    if cleaned_bands and cleaned_bands[-1]["minimum"] != 0:
        raise ValidationError(
            "The final grade band must start at zero "
            "to cover all scores."
        )

    # Preserve the original API structure and optional keys.
    policy = value.get("gpa_policy")
    if policy is not None:
        if not isinstance(policy, dict) or set(policy) != {"method", "repeat"}:
            raise ValidationError("GPA policy requires an explicit method and repeat rule, or null to disable.")
        if policy["method"] != "credit_weighted" or policy["repeat"] not in ("all", "latest", "best"):
            raise ValidationError("Choose credit_weighted and an all, latest or best repeated-course policy.")
        if not cleaned_bands:
            raise ValidationError("Configure grade bands and points before enabling GPA calculations.")

    # Return cleaned bands only when the caller supplied bands.
    cleaned = dict(value)

    if "bands" in cleaned:
        cleaned["bands"] = cleaned_bands

    return cleaned


def classify_grade(score, rules):
    """
    Classify a numeric course score using institute grade bands.

    Returns no letter grade or grade points when:
    - The score is unavailable.
    - The score is invalid.
    - No grade bands are configured.
    - No configured band matches the score.

    This function does not calculate or finalize a GPA.
    """

    unavailable = {
        "letter_grade": None,
        "grade_points": None,
    }

    if not number(score, 0, 100):
        return unavailable

    if not isinstance(rules, dict):
        return unavailable

    bands = rules.get("bands", [])

    if not isinstance(bands, list):
        return unavailable

    for band in bands:
        if not isinstance(band, dict):
            continue

        minimum = band.get("minimum")

        if not number(minimum, 0, 100):
            continue

        if score >= minimum:
            return {
                "letter_grade": band.get("label"),
                "grade_points": band.get("points"),
            }

    return unavailable
