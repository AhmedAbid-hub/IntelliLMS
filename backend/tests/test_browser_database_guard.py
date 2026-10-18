"""The browser launcher must refuse existing data before invoking Django."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[2]


def launch(directory=None):
    environment = {**os.environ}
    environment.pop("E2E_DATABASE_DIR", None)
    if directory is not None:
        environment["E2E_DATABASE_DIR"] = str(directory)
    return subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "e2e-server.py")],
        cwd=ROOT, env=environment, capture_output=True, text=True, timeout=15,
    )


def test_browser_launcher_requires_explicit_run_directory():
    result = launch()
    assert result.returncode != 0
    assert "Start browser tests through Playwright" in result.stderr


def test_browser_launcher_rejects_application_directory():
    result = launch(ROOT / "backend")
    assert result.returncode != 0
    assert "outside the isolated browser run directory" in result.stderr


def test_browser_launcher_preserves_existing_database_file():
    runs = ROOT / "backend" / "test-results" / "e2e-runs"
    runs.mkdir(parents=True, exist_ok=True)
    directory = Path(tempfile.mkdtemp(prefix="run-guard-", dir=runs))
    database = directory / "e2e.sqlite3"
    sentinel = b"Existing fixture data must not be migrated, seeded, or flushed."
    database.write_bytes(sentinel)
    result = launch(directory)
    assert result.returncode != 0
    assert "Refusing to reset an existing browser database" in result.stderr
    assert database.read_bytes() == sentinel
