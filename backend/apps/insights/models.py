from django.conf import settings
from django.db import models
from apps.accounts.models import TenantModel


class Activity(TenantModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    offering = models.ForeignKey("academics.Offering", on_delete=models.CASCADE)
    kind = models.CharField(max_length=50)


class Audit(TenantModel):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    action = models.CharField(max_length=100)
    object_id = models.CharField(max_length=60)
    detail = models.JSONField(default=dict)


class Prediction(TenantModel):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    offering = models.ForeignKey("academics.Offering", on_delete=models.CASCADE)
    probability = models.FloatField()
    category = models.CharField(max_length=15)
    version = models.CharField(max_length=80)
    features = models.JSONField()
    warning = models.TextField()
    input_digest = models.CharField(max_length=64, blank=True)
    context = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=["offering", "student", "input_digest"],
            condition=~models.Q(input_digest=""), name="unique_prediction_input",
        )]


class AnalysisRun(TenantModel):
    offering = models.ForeignKey("academics.Offering", on_delete=models.PROTECT)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    status = models.CharField(max_length=12, default="active")
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=["offering"], condition=models.Q(status="active"),
            name="one_active_class_analysis",
        )]


class AnalysisItem(TenantModel):
    run = models.ForeignKey(AnalysisRun, related_name="items", on_delete=models.CASCADE)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    status = models.CharField(max_length=24, default="pending")
    result = models.JSONField(default=dict)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["run", "student"], name="one_student_per_analysis")]
