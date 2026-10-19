"""Read-only account diagnostic; optional SMTP handshake, never sends mail."""
from email.utils import parseaddr
from django.conf import settings
from django.core.mail import get_connection
from django.core.mail.backends.smtp import EmailBackend as SMTPBackend
from django.core.management.base import BaseCommand, CommandError
from django.db import DatabaseError
from apps.accounts.invitations import invitation_status
from apps.accounts.mail_diagnostics import failure_category
from apps.accounts.models import User
from config.environment import database_identity


class Command(BaseCommand):
    help = "Show this process's mail/database configuration and optional invitation state without sending email."

    def add_arguments(self, parser):
        parser.add_argument("--email", help="Optional account email to locate in the selected database.")
        parser.add_argument("--probe-smtp", action="store_true", help="Connect, negotiate TLS and authenticate only. Never submits any message or changes invitation state.")

    def handle(self, *args, **options):
        self.stdout.write(f"Mail backend: {settings.EMAIL_BACKEND}")
        self.stdout.write(f"Database engine: {settings.DATABASES['default']['ENGINE']}")
        self.stdout.write(f"Database identity: {database_identity(settings.DATABASES['default'])}")
        self.stdout.write(f"Configuration source: {settings.CONFIG_SOURCE}")
        self.stdout.write(f"Frontend URL: {settings.FRONTEND_URL}")
        self.stdout.write(f"SMTP endpoint: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}; TLS={settings.EMAIL_USE_TLS}; SSL={settings.EMAIL_USE_SSL}; timeout={settings.EMAIL_TIMEOUT}s")
        self.stdout.write(f"SMTP username configured: {bool(settings.EMAIL_HOST_USER)}")
        self.stdout.write(f"SMTP password configured: {bool(settings.EMAIL_HOST_PASSWORD)}")
        self.stdout.write(f"Sender matches SMTP account: {parseaddr(settings.DEFAULT_FROM_EMAIL)[1].casefold() == settings.EMAIL_HOST_USER.casefold()}")
        self.stdout.write("These are this command's settings, not proof of another running server's settings or inbox delivery.")
        if options["email"]:
            try:
                users = list(User.objects.filter(email__iexact=options["email"]))
            except DatabaseError as exc:
                raise CommandError(f"Configured database unavailable ({type(exc).__name__}); no fallback attempted, no email sent.") from None
            self.stdout.write(f"Matching accounts in this database: {len(users)}")
            for user in users:
                status = invitation_status(user)
                self.stdout.write(f"Account active: {user.is_active}; password configured: {user.has_usable_password()}")
                self.stdout.write(f"Setup: {status['state']}; email evidence: {status['email_status'] or 'none'}")
        if options["probe_smtp"]:
            self.probe_smtp()
        self.stdout.write("Read-only diagnostic complete; no email sent and no records changed.")

    def probe_smtp(self):
        # No send_mail/send_messages/MAIL FROM/RCPT TO/DATA operation is used.
        # In particular, this cannot rotate or dispatch a reserved invitation.
        connection = None
        try:
            connection = get_connection(fail_silently=False)
            if not isinstance(connection, SMTPBackend):
                raise CommandError("SMTP probe requires the SMTP backend; no connection attempted.")
            if not (connection.use_tls or connection.use_ssl):
                raise CommandError("SMTP probe requires TLS or SSL before authentication.")
            if not connection.username or not connection.password:
                raise CommandError("SMTP probe requires configured authentication credentials.")
            if connection.timeout is None or not 0 < connection.timeout <= 60:
                raise CommandError("SMTP probe requires a bounded timeout of 1-60 seconds.")
            if not connection.open():
                raise CommandError("SMTP connection did not open; no message was submitted.")
            self.stdout.write("SMTP TLS/authentication succeeded. Message acceptance and inbox delivery remain unverified; no message submitted.")
        except CommandError:
            raise
        except Exception as exc:
            raise CommandError(f"SMTP probe failed: {failure_category(exc)} ({type(exc).__name__}). No message submitted; provider response withheld.") from None
        finally:
            if connection is not None:
                try:
                    connection.close()
                except Exception:
                    pass  # Do not leak a provider response while closing.
