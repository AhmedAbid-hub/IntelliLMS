"""Deterministic transport faults for guarded disposable browser tests only."""
from pathlib import Path
from smtplib import SMTPException
from django.conf import settings
from django.core.mail.backends.filebased import EmailBackend as FileBackend

class EmailBackend(FileBackend):
    def send_messages(self, messages):
        if not settings.DEBUG or Path(settings.DATABASES["default"]["NAME"]).name != "e2e.sqlite3":
            raise RuntimeError("Test mail backend requires the disposable browser database")
        for message in messages:
            for recipient in message.to:
                username=recipient.split("@")[0]
                if username.startswith("auth-browser-") and (settings.BASE_DIR / "test-results" / f"mail-fail-{username}").exists():
                    raise SMTPException("Simulated browser-test transport failure")
        return super().send_messages(messages)
