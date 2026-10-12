from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.accounts.models import TenantModel


class Unit(TenantModel):
    name = models.CharField(max_length=150)
    kind = models.CharField(max_length=30, default="department")
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["institute", "name"], name="unique_unit")
        ]


class Year(TenantModel):
    name = models.CharField(max_length=50)
    start = models.DateField()
    end = models.DateField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["institute", "name"], name="unique_year"),
            models.CheckConstraint(
                condition=models.Q(end__gte=models.F("start")), name="year_dates"
            ),
        ]


class Term(TenantModel):
    status = models.CharField(max_length=12, choices=[("planned", "Planned"), ("active", "Active"), ("closed", "Closed")], default="planned")
    name = models.CharField(max_length=80)
    year = models.ForeignKey(Year, on_delete=models.PROTECT)
    start = models.DateField()
    end = models.DateField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["year", "name"], name="unique_term"),
            models.CheckConstraint(
                condition=models.Q(end__gte=models.F("start")), name="term_dates"
            ),
        ]


class Program(TenantModel):
    duration_terms = models.PositiveSmallIntegerField(default=8, validators=[MinValueValidator(1), MaxValueValidator(40)])
    structure = models.CharField(max_length=12, choices=[("semester", "Semester"), ("annual", "Annual")], default="semester")
    active = models.BooleanField(default=True)
    name = models.CharField(max_length=120)
    unit = models.ForeignKey(Unit, null=True, blank=True, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "unit", "name"], name="unique_program_unit"
            ),
            models.UniqueConstraint(
                fields=["institute", "name"],
                condition=models.Q(unit__isnull=True),
                name="unique_program_without_unit",
            ),
        ]


class Section(TenantModel):
    batch = models.ForeignKey("AdmissionBatch", null=True, blank=True, on_delete=models.PROTECT)
    active = models.BooleanField(default=True)
    name = models.CharField(max_length=100)
    program = models.ForeignKey(Program, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["program", "name"], name="unique_section_program"
            )
        ]


class Course(TenantModel):
    credit_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(100)])
    active = models.BooleanField(default=True)
    code = models.CharField(max_length=30)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    unit = models.ForeignKey(Unit, null=True, blank=True, on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["institute", "code"], name="unique_course_code"
            )
        ]


class Offering(TenantModel):
    head_correction_review = models.BooleanField(default=False)
    course = models.ForeignKey(Course, on_delete=models.PROTECT)
    term = models.ForeignKey(Term, on_delete=models.PROTECT)
    section = models.ForeignKey(
        Section, null=True, blank=True, on_delete=models.PROTECT
    )
    title = models.CharField(max_length=150)
    teachers = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="teaching"
    )
    archived = models.BooleanField(default=False)
    assignment_weight = models.PositiveSmallIntegerField(default=60)
    quiz_weight = models.PositiveSmallIntegerField(default=40)
    manual_weight = models.PositiveSmallIntegerField(default=0)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    assignment_weight=100
                    - models.F("quiz_weight")
                    - models.F("manual_weight")
                ),
                name="weights_total_100",
            )
        ]


class Enrollment(TenantModel):
    offering = models.ForeignKey(
        Offering, on_delete=models.CASCADE, related_name="enrollments"
    )
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["offering", "student"], name="unique_enrollment"
            )
        ]


class Timetable(TenantModel):
    offering = models.ForeignKey(Offering, on_delete=models.CASCADE)
    day = models.PositiveSmallIntegerField(
        choices=[
            (i, d)
            for i, d in enumerate(
                [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                ]
            )
        ]
    )
    start = models.TimeField()
    end = models.TimeField()
    location = models.CharField(max_length=150)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end__gt=models.F("start")), name="meeting_times"
            )
        ]


class AdmissionBatch(TenantModel):
    name = models.CharField(max_length=120)
    program = models.ForeignKey(Program, on_delete=models.PROTECT)
    year = models.ForeignKey(Year, on_delete=models.PROTECT)
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["program", "name"], name="unique_admission_batch_program")]


class CurriculumItem(TenantModel):
    program = models.ForeignKey(Program, on_delete=models.PROTECT)
    course = models.ForeignKey(Course, on_delete=models.PROTECT)
    stage = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(40)])
    required = models.BooleanField(default=True)
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["program", "course", "stage"], name="unique_curriculum_subject_stage")]


class StudentPlacement(TenantModel):
    membership = models.ForeignKey("accounts.Membership", on_delete=models.PROTECT, related_name="placements")
    program = models.ForeignKey(Program, on_delete=models.PROTECT)
    batch = models.ForeignKey(AdmissionBatch, null=True, blank=True, on_delete=models.PROTECT)
    year = models.ForeignKey(Year, null=True, blank=True, on_delete=models.PROTECT)
    section = models.ForeignKey(Section, null=True, blank=True, on_delete=models.PROTECT)
    ended_at = models.DateTimeField(null=True, blank=True)
    reason = models.CharField(max_length=1000)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["membership"], condition=models.Q(ended_at__isnull=True), name="one_current_student_placement")]


class AdmissionReceipt(TenantModel):
    key = models.UUIDField()
    membership = models.ForeignKey("accounts.Membership", on_delete=models.PROTECT)
    digest = models.CharField(max_length=64)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["institute", "key"], name="unique_admission_request")]
