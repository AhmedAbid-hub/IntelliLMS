"""Use a dedicated test PostgreSQL service. pytest creates a separate test database."""

import os
from pathlib import Path
import subprocess
import sys

backend = Path(__file__).resolve().parents[1] / "backend"
environment = {**os.environ, "DB_ENGINE": "postgresql", "DEBUG": "True"}
for arguments in [
    ["manage.py", "check"],
    ["manage.py", "makemigrations", "--check", "--dry-run"],
    ["-m", "pytest", "-ra"],
]:
    subprocess.run(
        [sys.executable, *arguments], cwd=backend, env=environment, check=True
    )
