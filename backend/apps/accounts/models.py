import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    avatar = models.FileField(upload_to="avatars/", blank=True)
    notify_academic = models.BooleanField(default=True)


class Institute(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=180)
    code = models.SlugField(unique=True)
    kind = models.CharField(
        max_length=20,
        choices=[(x, x.title()) for x in ["school", "college", "university", "other"]],
    )
    active = models.BooleanField(default=True)
    terminology = models.JSONField(default=dict, blank=True)
    grading_rules = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name


class PlatformConfiguration(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    platform_name = models.CharField(max_length=32, default="IntelliLMS")
    support_email = models.EmailField(blank=True)
    login_notice = models.CharField(max_length=400, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(id=1), name="single_platform_configuration"
            )
        ]


class Membership(models.Model):
    ROLES = [
        (x, x.replace("_", " ").title())
        for x in ["admin", "head", "teacher", "student"]
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE)
    role = models.CharField(max_length=12, choices=ROLES)
    unit = models.ForeignKey(
        "academics.Unit", null=True, blank=True, on_delete=models.PROTECT
    )
    active = models.BooleanField(default=True)
    removed_at = models.DateTimeField(null=True, blank=True)
    display_name = models.CharField(max_length=150, blank=True)
    student_identifier = models.CharField(max_length=64, blank=True)
    section = models.ForeignKey("academics.Section", null=True, blank=True, on_delete=models.PROTECT)
    can_teach = models.BooleanField(default=False)
    eligible_units = models.ManyToManyField("academics.Unit", blank=True, related_name="eligible_teachers")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "institute"], name="unique_membership"
            ),
            models.UniqueConstraint(fields=["institute", "student_identifier"], condition=~models.Q(student_identifier=""), name="unique_institute_student_identifier"),
        ]


class TenantModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


class TeacherAppointment(TenantModel):
    membership = models.ForeignKey(Membership, on_delete=models.PROTECT, related_name="appointments")
    unit = models.ForeignKey("academics.Unit", on_delete=models.PROTECT)
    active = models.BooleanField(default=True)
    reason = models.CharField(max_length=1000)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["membership", "unit"], name="unique_department_teacher_appointment")]


class AccountInvitation(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="invitation")
    version = models.UUIDField(default=uuid.uuid4)
    issued_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    email_status = models.CharField(max_length=12, choices=[("pending", "Pending"), ("sent", "Submitted to mail backend"), ("failed", "Failed")], default="pending")
