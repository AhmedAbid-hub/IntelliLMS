"""Launch an isolated browser-test database; never touches the developer database."""

import os
from pathlib import Path
import subprocess
import sys
from e2e_database import database_path

backend = Path(__file__).resolve().parents[1] / "backend"
database = database_path()
if database.exists():
    raise RuntimeError("Refusing to reset an existing browser database. Start a fresh run.")
environment = {
    **os.environ,
    "DEBUG": "True",
    "DJANGO_SETTINGS_MODULE": "config.e2e_settings",
    "SECRET_KEY": "isolated-e2e-only-secret",
    "DB_ENGINE": "sqlite",
    "SQLITE_NAME": str(database),
    "ALLOWED_HOSTS": "localhost,127.0.0.1,testserver",
    "CSRF_TRUSTED_ORIGINS": f"http://127.0.0.1:{int(os.environ.get('E2E_FRONTEND_PORT', '5174'))}",
}
for arguments in [("migrate", "--noinput"), ("seed_demo",)]:
    subprocess.run(
        [sys.executable, "manage.py", *arguments],
        cwd=backend,
        env=environment,
        check=True,
    )
subprocess.run(
    [sys.executable, "manage.py", "runserver", f"127.0.0.1:{int(os.environ.get('E2E_BACKEND_PORT', '8001'))}", "--noreload"],
    cwd=backend,
    env=environment,
    check=True,
)
