"""Explicitly configured, provisional credit-weighted student results."""
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.accounts.models import Membership
from apps.accounts.scope import Scope
from apps.academics.models import Enrollment, CurriculumItem
from .gradebook import gradebook


NOTICE = "Provisional results use released course scores, the current configured grade bands and current subject credits. They are not a finalized transcript. Missing credits, unreleased results and ambiguous program placements are excluded and listed."


class PeriodResult(serializers.Serializer):
    term = serializers.UUIDField()
    label = serializers.CharField()
    gpa = serializers.FloatField(allow_null=True)
    credits = serializers.FloatField()
    attempts = serializers.IntegerField()


class ProgramResult(serializers.Serializer):
    program = serializers.UUIDField()
    label = serializers.CharField()
    cgpa = serializers.FloatField(allow_null=True)
    credits = serializers.FloatField()
    attempts = serializers.IntegerField()
    periods = PeriodResult(many=True)


class ExcludedResult(serializers.Serializer):
    offering = serializers.UUIDField()
    label = serializers.CharField()
    reason = serializers.CharField()


class AcademicResultsSerializer(serializers.Serializer):
    status = serializers.CharField()
    notice = serializers.CharField()
    policy = serializers.DictField(allow_null=True)
    programs = ProgramResult(many=True)
    excluded = ExcludedResult(many=True)


def weighted(attempts, repeat):
    selected = attempts
    if repeat != "all":
        by_course = {}
        for row in attempts:  # Chronological; tied best grades prefer the later attempt.
            old = by_course.get(row["course"])
            if old is None or repeat == "latest" or row["points"] >= old["points"]:
                by_course[row["course"]] = row
        selected = list(by_course.values())
    credits = sum((row["credits"] for row in selected), Decimal(0))
    points = sum((row["credits"] * row["points"] for row in selected), Decimal(0))
    return {"value": float((points / credits).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) if credits else None,
            "credits": float(credits), "attempts": len(selected)}


def academic_results(scope, member):
    policy = scope.institute.grading_rules.get("gpa_policy")
    response = {"status": "not_configured", "notice": NOTICE, "policy": policy, "programs": [], "excluded": []}
    if scope.institute.kind != "university" or not policy:
        return response
    enrollments = list(Enrollment.objects.filter(institute=scope.institute, student=member.user).select_related(
        "student", "offering__course__unit", "offering__term", "offering__section__program").order_by("offering__term__start", "offering__created_at", "pk")[:1001])
    if len(enrollments) > 1000:
        raise ValidationError("Academic results exceed 1,000 enrollments; request an academic record review.")
    placements = list(member.placements.select_related("program"))
    mappings = set(CurriculumItem.objects.filter(institute=scope.institute, program_id__in=[p.program_id for p in placements]).values_list("program_id", "course_id"))
    results = []
    for offset in range(0, len(enrollments), 100):
        results.extend(gradebook(scope, enrollments[offset:offset + 100]))
    groups, names = defaultdict(list), {}
    for enrollment, result in zip(enrollments, results):
        offering = enrollment.offering
        program = offering.section.program if offering.section_id else None
        if program is None:
            candidates = {p.program_id: p.program for p in placements if
                (p.term_id == offering.term_id if p.term_id else p.year_id == offering.term.year_id)
                and (p.program_id, offering.course_id) in mappings}
            if len(candidates) == 1:
                program = next(iter(candidates.values()))
        reason = None
        if result["grade_points"] is None:
            reason = "No released result with configured grade points"
        elif not offering.course.credit_hours or offering.course.credit_hours <= 0:
            reason = "Positive credit hours are not configured"
        elif program is None:
            reason = "Academic program cannot be identified unambiguously"
        if reason:
            response["excluded"].append({"offering": str(offering.pk), "label": offering.title, "reason": reason})
            continue
        names[program.pk] = program.name
        groups[program.pk].append({"course": offering.course_id, "term": offering.term_id, "term_label": offering.term.name,
                                  "points": Decimal(str(result["grade_points"])), "credits": offering.course.credit_hours})
    for program, attempts in groups.items():
        totals = weighted(attempts, policy["repeat"])
        periods = defaultdict(list)
        for row in attempts:
            periods[row["term"]].append(row)
        period_results = []
        for term, rows in periods.items():
            total = weighted(rows, policy["repeat"])
            period_results.append({"term": str(term), "label": rows[0]["term_label"], "gpa": total.pop("value"), **total})
        response["programs"].append({"program": str(program), "label": names[program], "cgpa": totals.pop("value"), **totals, "periods": period_results})
    response["status"] = "ready"
    return response


@extend_schema(responses=AcademicResultsSerializer)
@api_view(["GET"])
def student_results(request, pk=None):
    scope = Scope(request)
    if pk is None:
        if scope.role != "student":
            raise PermissionDenied("Use the authorized student's placement record.")
        member = scope.membership
    else:
        if scope.role != "admin":
            raise PermissionDenied("Individual complete academic results are available to the learner and Institute Admin.")
        member = get_object_or_404(Membership, institute=scope.institute, pk=pk, role="student")
    return Response(academic_results(scope, member))
