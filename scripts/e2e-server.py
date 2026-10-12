"""Launch an isolated browser-test database; never touches the developer database."""

import os
from pathlib import Path
import subprocess
import sys

backend = Path(__file__).resolve().parents[1] / "backend"
environment = {
    **os.environ,
    "DEBUG": "True",
    "DJANGO_SETTINGS_MODULE": "config.e2e_settings",
    "SECRET_KEY": "isolated-e2e-only-secret",
    "DB_ENGINE": "sqlite",
    "SQLITE_NAME": str(backend / "e2e.sqlite3"),
    "ALLOWED_HOSTS": "localhost,127.0.0.1,testserver",
    "CSRF_TRUSTED_ORIGINS": "http://127.0.0.1:5174",
}
for arguments in [("migrate", "--noinput"), ("flush", "--noinput"), ("seed_demo",)]:
    subprocess.run(
        [sys.executable, "manage.py", *arguments],
        cwd=backend,
        env=environment,
        check=True,
    )
subprocess.run(
    [sys.executable, "manage.py", "runserver", "127.0.0.1:8001", "--noreload"],
    cwd=backend,
    env=environment,
    check=True,
)
