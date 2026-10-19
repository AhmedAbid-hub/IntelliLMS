import os

from django.conf import settings
from django.contrib.staticfiles.management.commands.runserver import Command as BaseRunserver
from django.core.management.base import CommandError

from config.environment import database_identity
from config.server_lock import server_lock


class Command(BaseRunserver):
    def inner_run(self, *args, **options):
        if settings.DATABASES['default']['ENGINE'] == 'django.db.backends.sqlite3' and int(self.port) == 8000:
            raise CommandError("SQLite evaluation must use a separate port; 8000 is reserved for the normal PostgreSQL application.")
        # Acquired in the serving child, not the autoreloader parent. OS releases
        # the lock on exit/crash, so a stale PID file cannot block a later restart.
        lock = server_lock(settings.BASE_DIR, self.port)
        try:
            lock.__enter__()
        except OSError:
            raise CommandError("An IntelliLMS development backend already owns this checkout/port. Stop its owning terminal before restarting.") from None
        try:
            self.stdout.write(
                f"IntelliLMS PID={os.getpid()} configuration={settings.CONFIG_SOURCE} "
                f"database={database_identity(settings.DATABASES['default'])} "
                f"mail={settings.EMAIL_BACKEND} frontend={settings.FRONTEND_URL}"
            )
            self.stdout.flush()
            return super().inner_run(*args, **options)
        finally:
            lock.__exit__(None, None, None)
