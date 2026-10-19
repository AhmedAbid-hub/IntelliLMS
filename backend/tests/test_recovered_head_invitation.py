"""Recovered-account shape, exercised only on fictional isolated test records."""
import re
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core import mail, signing
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.invitations import SALT
from apps.accounts.models import AccountInvitation, Membership, User
from apps.academics.models import Unit


@pytest.mark.django_db
@pytest.mark.parametrize("kind", ["college", "university"])
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_recovered_head_retry_setup_and_session_scope(
    world, client_for, django_capture_on_commit_callbacks, kind,
):
    cache.clear()
    institute = world["a"]["institute"]
    institute.kind = kind
    institute.save(update_fields=["kind"])
    unit = Unit.objects.create(institute=institute, name="Recovered department fixture")
    user = User.objects.create_user(username="recovered-head-fixture", email="recovered@example.test")
    member = Membership.objects.create(institute=institute, unit=unit, user=user, role="head")
    invitation = AccountInvitation.objects.create(
        user=user, issued_at=timezone.now(), expires_at=timezone.now() + timedelta(hours=48),
        email_status="failed",
    )
    old_token = "i-" + signing.dumps(
        {"user": str(user.pk), "version": str(invitation.version)}, salt=SALT, compress=True,
    )
    counts = (User.objects.count(), Membership.objects.count(), AccountInvitation.objects.count())
    invitation_pk = invitation.pk
    admin = client_for(world["a"], "admin")
    endpoint = f"/api/v1/memberships/{member.pk}/resend-invitation/"

    # A failed retry keeps the account and invitation available for another attempt.
    with patch("apps.accounts.auth.send_mail", side_effect=TimeoutError("test transport outage")):
        with django_capture_on_commit_callbacks(execute=True):
            assert admin.post(endpoint).status_code == 200
    invitation.refresh_from_db()
    assert invitation.email_status == "failed"
    assert not user.has_usable_password()

    # Repeated clicks while the after-commit send is queued must coalesce.
    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        assert admin.post(endpoint).status_code == 200
        assert admin.post(endpoint).status_code == 200
    assert len(callbacks) == len(mail.outbox) == 1
    invitation.refresh_from_db()
    assert invitation.pk == invitation_pk and invitation.email_status == "local"
    uid, token = re.search(r"/reset/([^/\s]+)/([^/\s]+)", mail.outbox[0].body).groups()
    body = {"uid": uid, "token": token, "new_password": "Recovered-Account-Setup42!"}

    client = APIClient(enforce_csrf_checks=True)
    client.get("/api/v1/auth/csrf/")
    csrf = {"HTTP_X_CSRFTOKEN": client.cookies["csrftoken"].value}
    confirm = "/api/v1/auth/password-confirm/"
    assert client.post(confirm, body, format="json").status_code == 403
    assert client.post(confirm, {**body, "token": old_token}, format="json", **csrf).status_code == 400
    assert client.post(confirm, body, format="json", **csrf).status_code == 200
    assert client.post(confirm, body, format="json", **csrf).status_code == 400
    login = client.post("/api/v1/auth/login/", {
        "username": user.username, "password": body["new_password"],
    }, format="json", **csrf)
    assert login.status_code == 200
    csrf = {"HTTP_X_CSRFTOKEN": client.cookies["csrftoken"].value}
    assert login.data["institute_id"] == str(institute.pk)
    assert login.data["memberships"][0]["role"] == "head"
    assert str(login.data["memberships"][0]["unit_id"]) == str(unit.pk)
    assert client.get("/api/v1/units/").data["count"] == 1
    assert client.get(f'/api/v1/units/{world["a"]["unit"].pk}/').status_code == 404
    assert client.get(f'/api/v1/offerings/{world["a"]["offering"].pk}/').status_code == 404
    assert client.post("/api/v1/auth/select-institute/", {
        "institute_id": str(world["b"]["institute"].pk),
    }, format="json", **csrf).status_code == 403
    assert client.post("/api/v1/auth/select-workspace/", {
        "academic_workspace": "teaching",
    }, format="json", **csrf).status_code == 403
    assert admin.post(endpoint).status_code == 400
    user.refresh_from_db()
    invitation.refresh_from_db()
    assert user.check_password(body["new_password"]) and invitation.accepted_at is not None
    assert invitation.pk == invitation_pk
    assert counts == (User.objects.count(), Membership.objects.count(), AccountInvitation.objects.count())
    assert len(mail.outbox) == 1
    cache.clear()
