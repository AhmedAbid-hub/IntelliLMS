import logging
from drf_spectacular.utils import extend_schema
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import get_connection, send_mail
from django.core.mail.backends.smtp import EmailBackend as SMTPBackend
from django.core.mail.backends.locmem import EmailBackend as MemoryBackend
from django.core.mail.backends.filebased import EmailBackend as FileBackend
from django.http import JsonResponse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.throttling import AnonRateThrottle
from rest_framework.authentication import SessionAuthentication
from .models import User, Membership, Institute
from .institution import academic_config
from .contracts import (
    LoginInput,
    ProfileInput,
    SelectInstituteInput,
    SelectWorkspaceInput,
    PasswordChangeInput,
    PasswordResetInput,
    PasswordConfirmInput,
    IdentityResult,
    DetailResult,
    payload,
)


class LoginThrottle(AnonRateThrottle):
    scope = "login"


def identity(request):
    user = request.user
    memberships = list(
        Membership.objects.filter(
            user=user, active=True, institute__active=True
        ).values("institute_id", "institute__name", "role", "unit_id", "can_teach")
    )
    selected = request.session.get("institute_id")
    permitted = user.is_superuser or any(
        str(m["institute_id"]) == selected for m in memberships
    )
    institute = (
        Institute.objects.filter(pk=selected, active=True).first()
        if selected and permitted
        else None
    )
    return {
        "academic_workspace": request.session.get("academic_workspace", "department"),
        "institute_profile": (
            {
                "name": institute.name,
                "kind": institute.kind,
                "academic_config": academic_config(institute),
                "terminology": institute.terminology,
                "grading_rules": institute.grading_rules,
            }
            if institute
            else None
        ),
        "id": str(user.id),
        "avatar_url": f"/api/v1/auth/avatar/?v={user.avatar.name.rsplit('/', 1)[-1]}" if user.avatar else None,
        "notify_academic": user.notify_academic,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "is_superuser": user.is_superuser,
        "institute_id": request.session.get("institute_id"),
        "memberships": memberships,
    }


@ensure_csrf_cookie
@require_http_methods(["GET"])
def csrf(request):
    return JsonResponse({"detail": "CSRF cookie set."})


@csrf_protect
@extend_schema(request=LoginInput, responses=IdentityResult)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login_view(request):
    SessionAuthentication().enforce_csrf(request)
    values = payload(LoginInput, request.data)
    user = authenticate(
        request, username=values["username"], password=values["password"]
    )
    if not user or (not user.is_superuser and not Membership.objects.filter(user=user, active=True, institute__active=True).exists()):
        return Response(
            {"detail": "Invalid credentials or disabled account."}, status=400
        )
    login(request, user)
    request.session["academic_workspace"] = "department"
    membership = Membership.objects.filter(
        user=user, active=True, institute__active=True
    ).first()
    if membership:
        request.session["institute_id"] = str(membership.institute_id)
    return Response(identity(request))


@extend_schema(request=None, responses={204: None})
@api_view(["POST"])
def logout_view(request):
    logout(request)
    return Response(status=204)


@extend_schema(request=ProfileInput, responses=IdentityResult)
@api_view(["GET", "PATCH"])
def me(request):
    if request.method == "PATCH":
        values = payload(ProfileInput, request.data)
        for key, value in values.items():
            setattr(request.user, key, value)
        request.user.save(update_fields=list(values))
    return Response(identity(request))


@extend_schema(request=SelectInstituteInput, responses=IdentityResult)
@api_view(["POST"])
def select_institute(request):
    values = payload(SelectInstituteInput, request.data)
    institute = Institute.objects.filter(pk=values["institute_id"], active=True).first()
    if not institute or (
        not request.user.is_superuser
        and not Membership.objects.filter(
            user=request.user, institute=institute, active=True
        ).exists()
    ):
        return Response({"detail": "Institute access denied."}, status=403)
    request.session["institute_id"] = str(institute.id)
    request.session["academic_workspace"] = "department"
    return Response(identity(request))


@extend_schema(request=SelectWorkspaceInput, responses=IdentityResult)
@api_view(["POST"])
def select_workspace(request):
    values = payload(SelectWorkspaceInput, request.data)
    member = Membership.objects.filter(
        user=request.user, institute_id=request.session.get("institute_id"),
        institute__active=True, active=True, role="head",
    ).first()
    if request.user.is_superuser or not member:
        return Response({"detail": "Only Department Heads use separate management and teaching workspaces."}, status=403)
    if values["academic_workspace"] == "teaching" and not member.can_teach:
        return Response({"detail": "Teaching capability must be authorized by your Institute Admin."}, status=403)
    request.session["academic_workspace"] = values["academic_workspace"]
    return Response(identity(request))


@extend_schema(request=PasswordChangeInput, responses=DetailResult)
@api_view(["POST"])
def password_change(request):
    values = payload(PasswordChangeInput, request.data)
    if not request.user.check_password(values["old_password"]):
        raise ValidationError({"old_password": "Current password is incorrect."})
    new = values["new_password"]
    try:
        validate_password(new, request.user)
    except DjangoValidationError as e:
        raise ValidationError({"new_password": e.messages})
    request.user.set_password(new)
    request.user.save()
    update_session_auth_hash(request, request.user)
    return Response({"detail": "Password changed."})


def password_email_delivery(user, token, invitation=False):
    """Return transport evidence, never inbox delivery. Do not log message bodies."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    logger = logging.getLogger(__name__)
    try:
        connection = get_connection(fail_silently=False)
        if isinstance(connection, SMTPBackend):
            outcome = "accepted"
        elif isinstance(connection, (MemoryBackend, FileBackend)):
            outcome = "local"
        else:
            # Console prints the secret setup link to logs; dummy drops it.
            logger.error("Password email delivery failed for account %s: unsupported mail transport", user.pk)
            return "failed"
        sent = send_mail(
            "Your IntelliLMS invitation" if invitation else "Reset your IntelliLMS password",
            f"Set your password: {settings.FRONTEND_URL.rstrip('/')}/reset/{uid}/{token}\nThis link expires in {'48 hours' if invitation else '30 minutes'}. If you did not request this, contact your administrator.",
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            connection=connection,
            fail_silently=False,
        )
    except Exception as exc:
        # Delivery is after commit: a mail outage must not report account creation
        # as failed or prevent later CSV invitations from being attempted.
        # Do not log SMTP exception text, recipients, passwords or reset tokens.
        from .mail_diagnostics import failure_category
        logger.error("Password email delivery failed for account %s: %s (%s)", user.pk, failure_category(exc), type(exc).__name__)
        return "failed"
    if sent != 1:
        logger.error("Password email delivery failed for account %s: backend did not accept the message", user.pk)
        return "failed"
    return outcome


def send_password_email(user, token, invitation=False):
    return password_email_delivery(user, token, invitation) != "failed"


def send_reset(user):
    return send_password_email(user, default_token_generator.make_token(user))


@csrf_protect
@extend_schema(request=PasswordResetInput, responses=DetailResult)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def password_reset(request):
    SessionAuthentication().enforce_csrf(request)
    values = payload(PasswordResetInput, request.data)
    for user in User.objects.filter(email__iexact=values["email"], is_active=True):
        send_reset(user)
    return Response({"detail": "If this account exists, password reset instructions will be emailed. If no email arrives, try again or contact your administrator."})


@csrf_protect
@extend_schema(request=PasswordConfirmInput, responses=DetailResult)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
@transaction.atomic
def password_confirm(request):
    SessionAuthentication().enforce_csrf(request)
    values = payload(PasswordConfirmInput, request.data)
    try:
        user = User.objects.select_for_update().get(
            pk=urlsafe_base64_decode(values["uid"]).decode(),
            is_active=True,
        )
    except (ValueError, UnicodeDecodeError, User.DoesNotExist, DjangoValidationError):
        raise ValidationError("Invalid reset link.")
    from .invitations import check_invitation
    from .models import AccountInvitation
    if values["token"].startswith("i-"):
        check_invitation(user, values["token"])
    elif not default_token_generator.check_token(user, values["token"]):
        raise ValidationError("Invalid or expired reset link. Request a new password reset email.")
    password = values["new_password"]
    try:
        validate_password(password, user)
    except DjangoValidationError as e:
        raise ValidationError({"new_password": e.messages})
    user.set_password(password)
    user.save()
    AccountInvitation.objects.filter(user=user, accepted_at__isnull=True).update(accepted_at=timezone.now())
    return Response({"detail": "Password saved. You can sign in."})
