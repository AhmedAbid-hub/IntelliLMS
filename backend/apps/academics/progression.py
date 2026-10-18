"""Explicit administrative progression; never overwrite a historical placement."""
import hashlib
import json
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, generics
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.accounts.contracts import payload
from apps.accounts.models import Institute, Membership
from apps.accounts.scope import Scope
from apps.insights.models import Audit
from apps.insights.gradebook import gradebook
from apps.insights.filters import ReportPagination
from apps.insights.report_contracts import GradeRow
from .admission import PlacementInput, admin_scope, validate_placement
from .models import StudentPlacement, ProgressionDecision, Enrollment, CurriculumItem
from .serializers import serializer_for
from .eligibility import validate_retained_enrollments


class ProgressionInput(serializers.Serializer):
    operation = serializers.ChoiceField(choices=["progress", "repeat", "correct", "withdraw", "complete", "graduate"])
    expected_placement = serializers.UUIDField()
    reason = serializers.CharField(min_length=5, max_length=1000)
    target = PlacementInput(required=False)
    preview = serializers.BooleanField(default=True)
    confirm_review = serializers.BooleanField(default=False)
    evidence_token = serializers.CharField(max_length=64, required=False, default="")


class DecisionResult(serializers.Serializer):
    preview = serializers.BooleanField()
    evidence = serializers.DictField()
    evidence_token = serializers.CharField()
    decision = serializers.UUIDField(allow_null=True)
    placement = serializers.UUIDField(allow_null=True)


def result_evidence(scope, member, previous, operation):
    query = Enrollment.objects.filter(institute=scope.institute, student=member.user).select_related("student", "offering__course__unit", "offering__term")
    # A completion decision considers the whole program; other actions inspect the current period.
    placements = member.placements.filter(program=previous.program)
    if operation not in ("complete", "graduate"):
        placements = placements.filter(pk=previous.pk)
    stages = list(placements.values("stage", "term_id", "year_id"))
    mappings = list(CurriculumItem.objects.filter(institute=scope.institute, program=previous.program, required=True, active=True).values("stage", "course_id"))
    if operation not in ("complete", "graduate"):
        mappings = [item for item in mappings if item["stage"] == previous.stage]
    query = query.filter(offering__course_id__in=[item["course_id"] for item in mappings]).order_by("offering__term__start", "offering__created_at", "pk")
    enrollments = list(query[:1001])
    if len(enrollments) > 1000:
        raise ValidationError("This decision exceeds 1,000 historical enrollments; review the academic record with support.")
    rows = []
    for offset in range(0, len(enrollments), 100):
        rows.extend(gradebook(scope, enrollments[offset:offset + 100]))
    by_offering = {row["offering"]: row for row in rows}
    required = []
    for mapping in mappings:
        applicable = [p for p in stages if p["stage"] == mapping["stage"]]
        attempts = [e for e in enrollments if e.offering.course_id == mapping["course_id"] and any(
            e.offering.term_id == p["term_id"] if p["term_id"] else e.offering.term.year_id == p["year_id"] for p in applicable)]
        # Latest delivery is the evidence shown to the human reviewer, not a GPA repeat formula.
        record = by_offering.get(str(attempts[-1].offering_id)) if attempts else None
        required.append({"stage": mapping["stage"], "course": str(mapping["course_id"]), "offering": record["offering_label"] if record else None,
                         "score": record["score"] if record else None, "meeting_pass_mark": record["meeting_pass_mark"] if record else None})
    policy = scope.institute.grading_rules.get("progression_policy", "manual_review")
    evidence = {"policy": policy, "pass_mark": scope.institute.grading_rules.get("pass_mark", 50), "required_courses": required,
                "all_required_pass": bool(required) and all(r["meeting_pass_mark"] is True for r in required),
                "notice": "Recorded released grades are provisional. An authorized academic review is required; no ML prediction decides progression."}
    token = hashlib.sha256(json.dumps(evidence, sort_keys=True).encode()).hexdigest()
    return evidence, token


@extend_schema(request=ProgressionInput, responses=DecisionResult)
@api_view(["POST"])
@transaction.atomic
def progress_student(request, pk):
    scope = admin_scope(request)
    Institute.objects.select_for_update().get(pk=scope.institute.pk)
    member = get_object_or_404(Membership.objects.select_for_update(), institute=scope.institute, pk=pk, role="student", active=True, user__is_active=True)
    values = payload(ProgressionInput, request.data)
    previous = member.placements.filter(ended_at__isnull=True).select_related("program", "year", "term").first()
    if not previous or previous.pk != values["expected_placement"]:
        raise ValidationError("The current placement changed. Reload the student's record and review again.")
    operation = values["operation"]
    target, courses = None, []
    if operation in ("progress", "repeat", "correct"):
        if "target" not in values:
            raise ValidationError({"target": "Select the next academic placement."})
        target, courses = validate_placement(scope, values["target"])
        if operation != "correct":
            if previous.stage is None or not previous.year_id:
                raise ValidationError("Record the legacy placement's stage and period using a reasoned placement correction first.")
            school = scope.institute.kind == "school"
            expected = previous.stage + (operation == "progress" and not school)
            if target["stage"] != expected:
                raise ValidationError({"target": "Progress by one stage, or repeat the same stage."})
            if school and operation == "progress":
                if target["program"].pk == previous.program_id:
                    raise ValidationError("School promotion must select a different class; use repeat to retain this class.")
            elif target["program"].pk != previous.program_id or getattr(target["batch"], "pk", None) != previous.batch_id:
                raise ValidationError("Progression and repetition retain the program and admission batch. Use a placement correction for a program change.")
            if scope.institute.kind == "university":
                if not previous.term or not target["term"] or target["term"].start <= previous.term.end:
                    raise ValidationError("University progression/repetition requires a later, non-overlapping semester.")
            elif target["year"].start <= previous.year.end:
                raise ValidationError("Annual progression/repetition requires a later academic year.")
    elif operation in ("complete", "graduate"):
        if previous.stage != previous.program.duration_terms:
            raise ValidationError("Completion or graduation requires the final configured program stage.")
    withdrawn = Enrollment.objects.filter(institute=scope.institute, student=member.user, active=True)
    if operation == "correct":
        withdrawn = withdrawn.filter(offering__term=previous.term) if previous.term_id else withdrawn.filter(offering__term__year=previous.year)
        validate_retained_enrollments(scope, member.user, courses, withdrawn)
    evidence, _ = result_evidence(scope, member, previous, operation)
    token = hashlib.sha256(json.dumps({"evidence": evidence, **{k: v for k, v in values.items() if k not in ("preview", "confirm_review", "evidence_token")}}, sort_keys=True, default=str).encode()).hexdigest()
    if not values["preview"]:
        if not values["confirm_review"] or token != values["evidence_token"]:
            raise ValidationError("Preview the current academic evidence and explicitly confirm review before saving. Results may have changed.")
        if operation in ("progress", "complete", "graduate") and evidence["policy"] == "all_required_pass" and not evidence["all_required_pass"]:
            raise ValidationError("The configured progression policy requires a released passing result in every required curriculum subject.")
    response = {"preview": values["preview"], "evidence": evidence, "evidence_token": token, "decision": None, "placement": None}
    if values["preview"]:
        return Response(response)
    previous.ended_at, previous.end_reason = timezone.now(), operation
    previous.save(update_fields=["ended_at", "end_reason"])
    current = StudentPlacement.objects.create(institute=scope.institute, membership=member, actor=request.user, reason=values["reason"], **target) if target else None
    # Keep every enrollment/mark/attendance row; end only current course access.
    withdrawn_count = withdrawn.update(active=False)
    for course in courses:
        Enrollment.objects.update_or_create(institute=scope.institute, offering=course, student=member.user, defaults={"active": True})
    member.section = target["section"] if target else None
    member.unit = target["program"].unit if target else member.unit
    member.save(update_fields=["section", "unit"])
    decision = ProgressionDecision.objects.create(institute=scope.institute, membership=member, previous=previous, placement=current,
        operation=operation, reason=values["reason"], actor=request.user, evidence=evidence)
    Audit.objects.create(institute=scope.institute, actor=request.user, action="Student." + operation, object_id=str(member.pk),
        detail={"decision": str(decision.pk), "previous": str(previous.pk), "placement": str(current.pk) if current else None,
                "reason": values["reason"], "withdrawn_enrollments": withdrawn_count, "enrolled": [str(c.pk) for c in courses]})
    from apps.learning.notifications import notify_event
    notify_event(scope.institute, [member.user_id], "Academic decision recorded", f"Your institute recorded: {decision.get_operation_display()}. Contact your administrator for guidance.", event_key=f"progression:{decision.pk}", destination="/academic-history")
    response.update(decision=str(decision.pk), placement=str(current.pk) if current else None)
    return Response(response, status=201)


class ProgressionHistory(generics.ListAPIView):
    serializer_class = serializer_for(ProgressionDecision)
    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ProgressionDecision.objects.none()
        scope = Scope(self.request)
        if scope.role not in ("admin", "student"):
            raise PermissionDenied("Complete academic decision evidence is private to the learner and Institute Admin.")
        if "pk" not in self.kwargs:
            if scope.role != "student":
                raise PermissionDenied("This is the learner's own academic decision history.")
            member = scope.membership
        else:
            people = Membership.objects.filter(institute=scope.institute) if scope.role == "admin" else scope.people()
            member = get_object_or_404(people, pk=self.kwargs["pk"], role="student")
        return ProgressionDecision.objects.filter(institute=scope.institute, membership=member).order_by("-created_at")


class HistoryRow(GradeRow):
    term = serializers.CharField()
    active = serializers.BooleanField()


class HistoryPage(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = HistoryRow(many=True)


class AcademicHistory(generics.GenericAPIView):
    """Released academic results remain available to the learner after withdrawal."""
    pagination_class = ReportPagination
    serializer_class = HistoryRow

    @extend_schema(responses=HistoryPage)
    def get(self, request):
        scope = Scope(request)
        if scope.role != "student":
            raise PermissionDenied("This record is the signed-in student's personal academic history.")
        enrollments = Enrollment.objects.filter(institute=scope.institute, student=request.user).select_related("student", "offering__course__unit", "offering__term").order_by("-offering__term__start", "pk")
        page = self.paginate_queryset(enrollments)
        rows = gradebook(scope, page)
        for row, enrollment in zip(rows, page):
            row.update(term=enrollment.offering.term.name, active=enrollment.active)
        return self.get_paginated_response(rows)
