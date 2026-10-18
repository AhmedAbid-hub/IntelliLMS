"""Transport/transaction regressions; no real SMTP connections or live records."""
from io import StringIO
from datetime import timedelta
from smtplib import SMTPAuthenticationError
from unittest.mock import patch

import pytest
from django.core import mail
from django.core.management import call_command
from django.db import transaction
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.invitations import deliver_invitation, invitation_status, send_invitation
from apps.accounts.models import AccountInvitation, Membership, User

pytestmark = pytest.mark.django_db


def create(admin, role="student", **extra):
    return admin.post("/api/v1/memberships/", {
        "username": "delivery-new", "email": "delivery@example.test", "role": role, **extra,
    }, format="json")


@pytest.mark.parametrize("role", ["student", "teacher", "head"])
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", FRONTEND_URL="https://lms.example.test/")
def test_creation_reserves_once_and_delivers_correct_message_after_commit(world, client_for, django_capture_on_commit_callbacks, role):
    admin = client_for(world["a"], "admin")
    # The fixture already has a Head; use a separate own-institute department.
    from apps.academics.models import Unit
    unit = Unit.objects.create(institute=world["a"]["institute"], name="Invitation department")
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        response = create(admin, role, unit=str(unit.pk))
        assert response.status_code == 201
        assert response.data["invitation"]["state"] == "pending"
        assert response.data["invitation"]["email_status"] == "pending"
        user = User.objects.get(pk=response.data["user"])
        assert not send_invitation(user)  # Duplicate creation callback is harmless.
        assert not send_invitation(user, resend=True)  # Queued request coalesced.
        assert not mail.outbox
    assert len(callbacks) == len(mail.outbox) == 1
    invitation = AccountInvitation.objects.get(user=user)
    assert invitation.email_status == "local"
    assert invitation.expires_at - invitation.issued_at == timedelta(hours=48)
    message = mail.outbox[0]
    assert message.to == ["delivery@example.test"]
    assert message.subject == "Your IntelliLMS invitation"
    assert "https://lms.example.test/reset/" in message.body
    assert "test//reset/" not in message.body
    assert "/i-" in message.body
    deliver_invitation(user.pk, invitation.version)
    assert len(mail.outbox) == 1


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("accepted", [True, False])
@override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend")
def test_resend_response_contains_actual_post_commit_smtp_outcome(world, client_for, accepted, caplog):
    admin = client_for(world["a"], "admin")
    with patch("apps.accounts.auth.send_mail", return_value=1):
        created = create(admin)
    user = User.objects.get(pk=created.data["user"])
    assert user.invitation.email_status == "accepted"  # Intentionally cache relation.
    old_version = user.invitation.version
    failure = SMTPAuthenticationError(535, b"private-password token recipient@example.test")
    with patch("apps.accounts.auth.send_mail", return_value=1, side_effect=None if accepted else failure):
        response = admin.post(f'/api/v1/memberships/{created.data["id"]}/resend-invitation/')
    expected = "accepted" if accepted else "failed"
    assert response.status_code == 200
    assert response.data["email_status"] == expected
    assert invitation_status(user)["email_status"] == expected
    assert AccountInvitation.objects.get(user=user).version != old_version
    assert set(response.data) == {"state", "email_status", "issued_at", "expires_at", "accepted_at"}
    assert "private-password" not in caplog.text and "recipient@example.test" not in caplog.text
    if not accepted:
        assert "SMTPAuthenticationError" in caplog.text


@pytest.mark.parametrize("backend", ["console", "dummy"])
def test_nondelivering_backends_are_failed_without_logging_tokens(world, client_for, django_capture_on_commit_callbacks, backend, capsys, caplog):
    with override_settings(EMAIL_BACKEND=f"django.core.mail.backends.{backend}.EmailBackend"):
        with django_capture_on_commit_callbacks(execute=True):
            created = create(client_for(world["a"], "admin"))
    invitation = AccountInvitation.objects.get(user_id=created.data["user"])
    assert invitation.email_status == "failed"
    output = capsys.readouterr()
    assert "/reset/" not in output.out + output.err + caplog.text
    assert "delivery@example.test" not in caplog.text


@pytest.mark.parametrize("result", [0, ValueError("private transport detail")])
def test_zero_or_unexpected_transport_error_is_failed(world, client_for, django_capture_on_commit_callbacks, result, caplog):
    with patch("apps.accounts.auth.send_mail", return_value=result, side_effect=result if isinstance(result, Exception) else None):
        with django_capture_on_commit_callbacks(execute=True):
            created = create(client_for(world["a"], "admin"))
    assert AccountInvitation.objects.get(user_id=created.data["user"]).email_status == "failed"
    assert "private transport detail" not in caplog.text


def test_outer_rollback_discards_account_invitation_and_delivery(world, client_for, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        with pytest.raises(RuntimeError), transaction.atomic():
            response = create(client_for(world["a"], "admin"))
            assert response.status_code == 201
            assert AccountInvitation.objects.filter(user_id=response.data["user"]).exists()
            raise RuntimeError("rollback fixture")
    assert not callbacks
    assert not User.objects.filter(username="delivery-new").exists()
    assert not mail.outbox


def test_existing_password_and_revoked_queued_account_are_protected(world, client_for, django_capture_on_commit_callbacks):
    existing = world["a"]["student"]
    assert not send_invitation(existing, resend=True)
    assert not AccountInvitation.objects.filter(user=existing).exists()
    with django_capture_on_commit_callbacks(execute=True):
        created = create(client_for(world["a"], "admin"))
        Membership.objects.filter(pk=created.data["id"]).update(active=False)
    assert not mail.outbox
    assert AccountInvitation.objects.get(user_id=created.data["user"]).email_status == "failed"


@pytest.mark.parametrize("role", ["head", "teacher", "student"])
def test_resend_denies_other_roles_and_tenants(world, client_for, role, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        created = create(client_for(world["a"], "admin"))
    endpoint = f'/api/v1/memberships/{created.data["id"]}/resend-invitation/'
    version = AccountInvitation.objects.get(user_id=created.data["user"]).version
    assert client_for(world["a"], role).post(endpoint).status_code == 403
    assert client_for(world["b"], "admin").post(endpoint).status_code == 404
    assert APIClient().post(endpoint).status_code == 403
    assert AccountInvitation.objects.get(user_id=created.data["user"]).version == version


def test_stranded_pending_retry_and_legacy_transport_are_honest(world, client_for, django_capture_on_commit_callbacks):
    admin = client_for(world["a"], "admin")
    with django_capture_on_commit_callbacks(execute=False):
        created = create(admin)
    AccountInvitation.objects.filter(user_id=created.data["user"]).update(issued_at=timezone.now()-timedelta(minutes=5))
    with django_capture_on_commit_callbacks(execute=True):
        assert admin.post(f'/api/v1/memberships/{created.data["id"]}/resend-invitation/').status_code == 200
    assert len(mail.outbox) == 1
    AccountInvitation.objects.filter(user_id=created.data["user"]).update(email_status="sent")
    assert admin.get(f'/api/v1/memberships/{created.data["id"]}/').data["invitation"]["email_status"] == "sent"


def test_resend_does_not_reset_account_with_password_even_if_invitation_is_unaccepted(world, client_for, django_capture_on_commit_callbacks):
    admin = client_for(world["a"], "admin")
    with django_capture_on_commit_callbacks(execute=True):
        created = create(admin)
    user = User.objects.get(pk=created.data["user"])
    user.set_password("Already-Configured-Password82!")
    user.save(update_fields=["password"])
    version = AccountInvitation.objects.get(user=user).version
    assert admin.post(f'/api/v1/memberships/{created.data["id"]}/resend-invitation/').status_code == 400
    assert AccountInvitation.objects.get(user=user).version == version
    assert len(mail.outbox) == 1


@override_settings(EMAIL_HOST_PASSWORD="private-diagnostic-password", EMAIL_HOST_USER="private-diagnostic-user")
def test_read_only_diagnostic_never_sends_or_discloses_credentials(world):
    output = StringIO()
    with patch("apps.accounts.auth.send_mail") as send:
        call_command("check_invitation_delivery", email=world["a"]["student"].email, stdout=output)
    send.assert_not_called()
    assert "Matching accounts in this database: 1" in output.getvalue()
    assert "private-diagnostic" not in output.getvalue()
    assert not AccountInvitation.objects.exists()
