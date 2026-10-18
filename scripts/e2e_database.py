"""Resolve only a run-specific browser fixture, never an application database."""
import os
from pathlib import Path


def database_path():
    root = Path(__file__).resolve().parents[1] / "backend" / "test-results" / "e2e-runs"
    configured = os.environ.get("E2E_DATABASE_DIR")
    if not configured:
        raise RuntimeError("Start browser tests through Playwright to create an isolated run.")
    directory = Path(configured).resolve()
    if directory.parent != root.resolve() or not directory.name.startswith("run-"):
        raise RuntimeError("Refusing a database outside the isolated browser run directory.")
    return directory / "e2e.sqlite3"
