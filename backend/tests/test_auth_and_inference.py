import pytest
from datetime import timedelta
from unittest.mock import patch
from django.utils import timezone
from django.test import override_settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework.test import APIClient
from apps.learning.models import Assignment, Submission, AttendanceSession, Attendance
from apps.insights.models import Prediction
from ml.train import train, synthetic


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_password_reset_change_and_session(world, client_for):
    from django.core import mail

    a = world["a"]
    client = APIClient(enforce_csrf_checks=True)
    client.get("/api/v1/auth/csrf/")
    headers = {"HTTP_X_CSRFTOKEN": client.cookies["csrftoken"].value}
    assert (
        client.post(
            "/api/v1/auth/password-reset/", {"email": a["student"].email}, **headers
        ).status_code
        == 200
    )
    assert len(mail.outbox) == 1
    assert "Strong-demo-pass42!" not in mail.outbox[0].body
    uid = urlsafe_base64_encode(force_bytes(a["student"].pk))
    token = default_token_generator.make_token(a["student"])
    response = client.post(
        "/api/v1/auth/password-confirm/",
        {"uid": uid, "token": token, "new_password": "New-Complex-Password82!"},
        **headers,
    )
    assert response.status_code == 200
    a["student"].refresh_from_db()
    assert a["student"].check_password("New-Complex-Password82!")
    assert (
        client.post(
            "/api/v1/auth/password-confirm/",
            {"uid": uid, "token": token, "new_password": "Another-Complex98!"},
            **headers,
        ).status_code
        == 400
    )
    signed = client_for(a, "student")
    assert (
        signed.post(
            "/api/v1/auth/password-change/",
            {"old_password": "New-Complex-Password82!", "new_password": "123"},
        ).status_code
        == 400
    )
    assert (
        signed.post(
            "/api/v1/auth/password-change/",
            {
                "old_password": "New-Complex-Password82!",
                "new_password": "Different-Complex-99!",
            },
        ).status_code
        == 200
    )
    assert signed.get("/api/v1/auth/me/").status_code == 200


@pytest.mark.django_db
def test_real_trusted_inference_persists_metadata(world, client_for, tmp_path):
    a = world["a"]
    report = train(synthetic(n=400), output=tmp_path)
    for number in range(3):
        session = AttendanceSession.objects.create(
            institute=a["institute"],
            offering=a["offering"],
            date=timezone.now().date() - timedelta(days=number),
        )
        Attendance.objects.create(
            institute=a["institute"],
            session=session,
            student=a["student"],
            status="present",
        )
    for number in range(2):
        assignment = Assignment.objects.create(
            institute=a["institute"],
            offering=a["offering"],
            title=f"Assessment {number}",
            due_at=timezone.now(),
            published=True,
        )
        Submission.objects.create(
            institute=a["institute"],
            assignment=assignment,
            student=a["student"],
            marks=75,
            released=True,
        )
    with patch("ml.inference.ARTIFACTS", tmp_path):
        result = client_for(a, "teacher").post(
            "/api/v1/predictions/",
            {"offering": str(a["offering"].pk), "student": str(a["student"].pk)},
        )
        assert result.status_code == 200
        assert result.data["status"] == "ready"
        assert 0 <= result.data["probability"] <= 1
        prediction = Prediction.objects.get()
        assert prediction.version == report["version"]
        assert "SYNTHETIC DATA" in prediction.warning
        (tmp_path / report["artifact"]).write_bytes(b"corrupt")
        status = client_for(a, "teacher").get("/api/v1/model-status/")
        assert status.data["status"] == "model_unavailable"
