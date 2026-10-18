"""Read-only diagnostic: never connects to SMTP or emits a setup link/credential."""
from django.conf import settings
from django.core.management.base import BaseCommand
from apps.accounts.invitations import invitation_status
from apps.accounts.models import User


class Command(BaseCommand):
    help = "Show this process's mail/database configuration and optional invitation state without sending email."

    def add_arguments(self, parser):
        parser.add_argument("--email", help="Optional account email to locate in the selected database.")

    def handle(self, *args, **options):
        self.stdout.write(f"Mail backend: {settings.EMAIL_BACKEND}")
        self.stdout.write(f"Database engine: {settings.DATABASES['default']['ENGINE']}")
        self.stdout.write(f"Frontend URL: {settings.FRONTEND_URL}")
        self.stdout.write(f"SMTP username configured: {bool(settings.EMAIL_HOST_USER)}")
        self.stdout.write(f"SMTP password configured: {bool(settings.EMAIL_HOST_PASSWORD)}")
        self.stdout.write("These are this command's settings, not proof of another running server's settings or inbox delivery.")
        if options["email"]:
            users = list(User.objects.filter(email__iexact=options["email"]))
            self.stdout.write(f"Matching accounts in this database: {len(users)}")
            for user in users:
                status = invitation_status(user)
                self.stdout.write(f"Account active: {user.is_active}; password configured: {user.has_usable_password()}")
                self.stdout.write(f"Setup: {status['state']}; email evidence: {status['email_status'] or 'none'}")
        self.stdout.write("Read-only diagnostic complete; no email sent and no records changed.")
