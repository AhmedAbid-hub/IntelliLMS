import uuid
from datetime import timedelta
from django.conf import settings
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import AccountInvitation, User, Membership

SALT = "intellilms.account-invitation.v1"

class InvitationStatus(serializers.Serializer):
    state = serializers.CharField()
    email_status = serializers.CharField(allow_null=True)
    issued_at = serializers.DateTimeField(allow_null=True)
    expires_at = serializers.DateTimeField(allow_null=True)
    accepted_at = serializers.DateTimeField(allow_null=True)


def invitation_status(user):
    try:
        invitation = user.invitation
    except AccountInvitation.DoesNotExist:
        return dict(state="existing_account", email_status=None, issued_at=None, expires_at=None, accepted_at=None)
    state = "accepted" if invitation.accepted_at else "expired" if invitation.expires_at < timezone.now() else "pending"
    return dict(state=state, email_status=invitation.email_status, issued_at=invitation.issued_at, expires_at=invitation.expires_at, accepted_at=invitation.accepted_at)


def send_invitation(user):
    from .auth import send_password_email
    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=user.pk)
        if not user.is_active or not Membership.objects.filter(user=user, active=True, institute__active=True).exists():
            return False
        invitation = AccountInvitation.objects.filter(user=user).first()
        if invitation and invitation.accepted_at:
            return False
        now = timezone.now()
        invitation, _ = AccountInvitation.objects.update_or_create(user=user, defaults=dict(version=uuid.uuid4(),issued_at=now,expires_at=now+timedelta(seconds=settings.INVITATION_TIMEOUT),accepted_at=None,email_status="pending"))
        version = invitation.version
        token = "i-" + signing.dumps({"user":str(user.pk),"version":str(version)},salt=SALT,compress=True)
    sent = send_password_email(user, token, invitation=True)
    AccountInvitation.objects.filter(user=user,version=version).update(email_status="sent" if sent else "failed")
    return sent


def check_invitation(user, token):
    try:
        data = signing.loads(token[2:],salt=SALT,max_age=settings.INVITATION_TIMEOUT)
        invitation = AccountInvitation.objects.get(user=user,version=data["version"],accepted_at__isnull=True,expires_at__gte=timezone.now())
        if data["user"] != str(user.pk) or not Membership.objects.filter(user=user,active=True,institute__active=True).exists():
            raise ValueError()
    except (signing.BadSignature, DjangoValidationError, AccountInvitation.DoesNotExist, ValueError, KeyError, TypeError):
        raise ValidationError("Invalid or expired invitation. Ask your institute administrator to resend it.")
    return invitation
