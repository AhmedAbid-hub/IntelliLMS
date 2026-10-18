import re
import time
from datetime import timedelta
from unittest.mock import patch
import pytest
from django.conf import settings
from django.core import mail
from django.core.cache import cache
from django.contrib.auth.tokens import default_token_generator
from django.test import override_settings
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework.test import APIClient
from apps.accounts.models import User, AccountInvitation

pytestmark = pytest.mark.django_db

def link(message):
    uid, token = re.search(r"/reset/([^/\s]+)/([^/\s]+)",message.body).groups()
    return {"uid":uid,"token":token,"new_password":"Invitation-Strong-Password42!"}

@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_invitation_resend_invalidates_previous_and_accepts_once(world,client_for,django_capture_on_commit_callbacks):
    cache.clear(); admin=client_for(world["a"],"admin")
    with django_capture_on_commit_callbacks(execute=True):
        created=admin.post("/api/v1/memberships/",{"username":"invitation-new","email":"invite@example.test","role":"teacher","last_name":"Example"},format="json")
    assert created.status_code == 201
    user=User.objects.get(pk=created.data["user"])
    assert not user.has_usable_password() and user.last_name == "Example"
    old=link(mail.outbox[-1]); url=f'/api/v1/memberships/{created.data["id"]}/'
    assert admin.get(url).data["invitation"]["email_status"] == "local"
    assert (user.invitation.expires_at-user.invitation.issued_at).total_seconds()==48*3600
    assert client_for(world["a"],"teacher").post(url+"resend-invitation/").status_code == 403
    assert client_for(world["b"],"admin").post(url+"resend-invitation/").status_code == 404
    with django_capture_on_commit_callbacks(execute=True):
        assert admin.post(url+"resend-invitation/").status_code == 200
    new=link(mail.outbox[-1]); assert old["token"]!=new["token"]
    anonymous=APIClient()
    assert anonymous.post("/api/v1/auth/password-confirm/",old,format="json").status_code==400
    assert anonymous.post("/api/v1/auth/password-confirm/",{**new,"new_password":"Abcd-234567"},format="json").status_code==400
    assert anonymous.post("/api/v1/auth/password-confirm/",new,format="json").status_code==200
    assert anonymous.post("/api/v1/auth/password-confirm/",new,format="json").status_code==400
    assert admin.get(url).data["invitation"]["state"] == "accepted"
    assert admin.post(url+"resend-invitation/").status_code == 400
    cache.clear()

@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_invitation_48h_expiry_and_revoked_membership(world,client_for,django_capture_on_commit_callbacks):
    cache.clear();admin=client_for(world["a"],"admin")
    with django_capture_on_commit_callbacks(execute=True):
        created=admin.post("/api/v1/memberships/",{"username":"expiry-user","email":"expiry@example.test","role":"student"},format="json")
    data=link(mail.outbox[-1]); anonymous=APIClient()
    with patch("django.core.signing.time.time",return_value=time.time()+48*3600+2):
        result=anonymous.post("/api/v1/auth/password-confirm/",data,format="json")
        assert result.status_code==400 and "resend" in str(result.data)
    from apps.accounts.models import Membership
    Membership.objects.filter(pk=created.data["id"]).update(active=False)
    assert anonymous.post("/api/v1/auth/password-confirm/",data,format="json").status_code==400
    Membership.objects.filter(pk=created.data["id"]).update(active=True)
    with patch("django.core.signing.time.time",return_value=time.time()+47*3600):
        assert anonymous.post("/api/v1/auth/password-confirm/",data,format="json").status_code==200
    cache.clear()


def test_reset_30m_expiry_and_failed_delivery_visible(world,client_for,django_capture_on_commit_callbacks):
    cache.clear();a=world["a"];anonymous=APIClient()
    assert settings.PASSWORD_RESET_TIMEOUT==1800
    token=default_token_generator.make_token(a["student"])
    body={"uid":urlsafe_base64_encode(force_bytes(a["student"].pk)),"token":token,"new_password":"New-Secure-Password82!"}
    with patch.object(default_token_generator,"_now",return_value=default_token_generator._now()+timedelta(minutes=31)):
        assert anonymous.post("/api/v1/auth/password-confirm/",body,format="json").status_code==400
    admin=client_for(a,"admin")
    with patch("apps.accounts.auth.send_mail",side_effect=OSError("private transport")):
        with django_capture_on_commit_callbacks(execute=True):
            created=admin.post("/api/v1/memberships/",{"username":"failed-invite","email":"failed@example.test","role":"student"},format="json")
    url=f'/api/v1/memberships/{created.data["id"]}/'
    assert created.status_code==201
    assert admin.get(url).data["invitation"]["email_status"]=="failed"
    with patch("apps.accounts.auth.send_mail",return_value=1):
        with django_capture_on_commit_callbacks(execute=True):
            assert admin.post(url+"resend-invitation/").status_code==200
    assert admin.get(url).data["invitation"]["email_status"]=="local"
    assert anonymous.post("/api/v1/auth/password-confirm/",body,format="json").status_code==200
    cache.clear()
