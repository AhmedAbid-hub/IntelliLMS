from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.accounts.models import TenantModel


class OfferingRecord(TenantModel):
    offering = models.ForeignKey("academics.Offering", on_delete=models.CASCADE)

    class Meta:
        abstract = True


class Module(OfferingRecord):
    title = models.CharField(max_length=150)
    position = models.PositiveIntegerField(default=0)


class Lesson(OfferingRecord):
    module = models.ForeignKey(Module, null=True, blank=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=180)
    body = models.TextField(blank=True)
    video_url = models.URLField(blank=True)
    position = models.PositiveIntegerField(default=0)
    published = models.BooleanField(default=False)
    visible_at = models.DateTimeField(null=True, blank=True)


class Completion(TenantModel):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["lesson", "student"], name="unique_completion"
            )
        ]


class Material(OfferingRecord):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    title = models.CharField(max_length=180)
    file = models.FileField(upload_to="materials/%Y/%m/")


class Assignment(OfferingRecord):
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to="assignment-resources/%Y/%m/", blank=True)
    max_marks = models.PositiveIntegerField(default=100)
    due_at = models.DateTimeField()
    published = models.BooleanField(default=False)
    allow_late = models.BooleanField(default=False)
    allow_resubmit = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(max_marks__gt=0), name="assignment_positive_marks"
            )
        ]


class Submission(TenantModel):
    finalized = models.BooleanField(default=False)
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    text = models.TextField(blank=True)
    file = models.FileField(upload_to="submissions/%Y/%m/", blank=True)
    submitted_at = models.DateTimeField(default=timezone.now)
    late = models.BooleanField(default=False)
    marks = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)
    released = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["assignment", "student"], name="unique_submission"
            )
        ]


class Quiz(OfferingRecord):
    title = models.CharField(max_length=180)
    published = models.BooleanField(default=False)
    opens_at = models.DateTimeField()
    closes_at = models.DateTimeField()
    minutes = models.PositiveIntegerField(default=30)
    attempt_limit = models.PositiveSmallIntegerField(default=1)
    released = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(closes_at__gt=models.F("opens_at")),
                name="quiz_window",
            ),
            models.CheckConstraint(
                condition=models.Q(minutes__gt=0, attempt_limit__gt=0),
                name="quiz_limits",
            ),
        ]


class Question(TenantModel):
    position = models.PositiveIntegerField(default=0)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    prompt = models.TextField()
    kind = models.CharField(
        max_length=10,
        choices=[
            ("mcq", "Multiple choice"),
            ("boolean", "True/false"),
            ("short", "Short answer"),
        ],
    )
    options = models.JSONField(default=list, blank=True)
    answer = models.TextField(blank=True)
    marks = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["position", "created_at", "pk"]


class BankQuestion(TenantModel):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    unit = models.ForeignKey(
        "academics.Unit", null=True, blank=True, on_delete=models.PROTECT
    )
    prompt = models.TextField()
    kind = models.CharField(
        max_length=10, choices=Question._meta.get_field("kind").choices
    )
    options = models.JSONField(default=list, blank=True)
    answer = models.TextField(blank=True)
    marks = models.PositiveIntegerField(default=1)


class Attempt(TenantModel):
    finalized = models.BooleanField(default=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    started_at = models.DateTimeField(auto_now_add=True)
    deadline = models.DateTimeField()
    submitted_at = models.DateTimeField(null=True, blank=True)
    answers = models.JSONField(default=dict)
    marks = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    manual_marks = models.JSONField(default=dict)


class AttendanceSession(OfferingRecord):
    finalized = models.BooleanField(default=False)
    date = models.DateField()
    title = models.CharField(max_length=120, default="Class meeting")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["offering", "date", "title"], name="unique_meeting"
            )
        ]


class Attendance(TenantModel):
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    status = models.CharField(
        max_length=10,
        choices=[(s, s.title()) for s in ["present", "absent", "late", "excused"]],
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["session", "student"], name="unique_attendance"
            )
        ]


class Announcement(TenantModel):
    title = models.CharField(max_length=180)
    body = models.TextField()
    unit = models.ForeignKey(
        "academics.Unit", null=True, blank=True, on_delete=models.CASCADE
    )
    offering = models.ForeignKey(
        "academics.Offering", null=True, blank=True, on_delete=models.CASCADE
    )
    published = models.BooleanField(default=False)


class ManualGrade(OfferingRecord):
    finalized = models.BooleanField(default=False)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    title = models.CharField(max_length=180)
    marks = models.DecimalField(max_digits=7, decimal_places=2)
    max_marks = models.PositiveIntegerField(default=100)
    feedback = models.TextField(blank=True)
    released = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    max_marks__gt=0, marks__gte=0, marks__lte=models.F("max_marks")
                ),
                name="manual_grade_range",
            ),
            models.UniqueConstraint(
                fields=["offering", "student", "title"], name="unique_manual_grade"
            ),
        ]


class Notification(TenantModel):
    destination = models.CharField(max_length=300, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=180)
    body = models.TextField(blank=True)
    read = models.BooleanField(default=False)
    event_key = models.CharField(max_length=180, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "institute", "event_key"],
                name="unique_notification_event",
            )
        ]


class CorrectionRequest(OfferingRecord):
    kind = models.CharField(max_length=20, choices=[(v,v) for v in ["submission","attempt","manual","attendance"]])
    target = models.UUIDField()
    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="academic_correction_requests")
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="academic_correction_reviews")
    original = models.JSONField()
    proposed = models.JSONField()
    reason = models.CharField(max_length=1000)
    decision_reason = models.CharField(max_length=1000, blank=True)
    status = models.CharField(max_length=12, choices=[(v,v) for v in ["pending","approved","rejected"]], default="pending")
    decided_at = models.DateTimeField(null=True, blank=True)
    emergency = models.BooleanField(default=False)
