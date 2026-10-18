"""Validation shared by individual placements and bounded course enrollment."""
from django.db.models import Exists, OuterRef
from rest_framework.exceptions import ValidationError
from .models import Enrollment, StudentPlacement


def validate_course_selection(courses):
    for index, course in enumerate(courses):
        for other in courses[:index]:
            if course.course_id == other.course_id and course.term.start <= other.term.end and other.term.start <= course.term.end:
                raise ValidationError({"offerings": "Do not enroll in overlapping deliveries of the same subject."})


def validate_retained_enrollments(scope, student, courses, withdrawn):
    """A transfer must not conflict with a course the administrator is retaining."""
    retained = Enrollment.objects.filter(institute=scope.institute, student=student, active=True).exclude(pk__in=withdrawn.values("pk"))
    for course in courses:
        if retained.filter(offering__course_id=course.course_id,
                offering__term__start__lte=course.term.end,
                offering__term__end__gte=course.term.start).exclude(offering=course).exists():
            raise ValidationError({"offerings": "Withdraw the overlapping delivery of this subject before enrolling in its replacement."})


def validate_enrollment(scope, offering, members):
    if offering.term.status == "closed":
        raise ValidationError("Enrollment is closed for this academic period.")
    if offering.section_id and members.filter(section__isnull=False).exclude(section_id=offering.section_id).exists():
        raise ValidationError("Selected students must belong to the offering's section. Correct placement first if necessary.")
    placements = StudentPlacement.objects.filter(membership_id=OuterRef("pk"))
    if offering.term.period_type and StudentPlacement.objects.filter(
        institute=scope.institute, membership__in=members, ended_at__isnull=True
    ).exclude(program__structure=offering.term.period_type).exists():
        raise ValidationError("The course period is incompatible with a selected student's current academic structure.")
    if members.annotate(current_placement=Exists(placements.filter(ended_at__isnull=True)), terminal=Exists(placements.filter(end_reason__in=["withdraw", "complete", "graduate"]))).filter(current_placement=False, terminal=True).exists():
        raise ValidationError("Record an audited new placement before enrolling a withdrawn or completed student.")
    if Enrollment.objects.filter(institute=scope.institute, student_id__in=members.values("user_id"), active=True,
            offering__course_id=offering.course_id, offering__term__start__lte=offering.term.end, offering__term__end__gte=offering.term.start).exclude(offering=offering).exists():
        raise ValidationError("A selected student already has an active enrollment in an overlapping delivery of this subject.")
