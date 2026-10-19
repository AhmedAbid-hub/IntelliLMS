"""Reject accidental local configuration drift without overriding any secrets."""
import os
import sys
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import dotenv_values, load_dotenv

CONNECTION_KEYS = (
    "DB_ENGINE", "POSTGRES_DB", "POSTGRES_HOST", "POSTGRES_PORT",
    "POSTGRES_USER", "POSTGRES_PASSWORD", "SQLITE_NAME", "EMAIL_BACKEND",
    "EMAIL_HOST", "EMAIL_PORT", "EMAIL_HOST_USER", "EMAIL_HOST_PASSWORD",
    "EMAIL_USE_TLS", "EMAIL_USE_SSL", "EMAIL_TIMEOUT", "DEFAULT_FROM_EMAIL",
    "FRONTEND_URL",
)


def load_environment(path, *, environ=None, testing=None):
    env = os.environ if environ is None else environ
    if testing is None:
        testing = "pytest" in sys.modules or env.get("DJANGO_SETTINGS_MODULE") == "config.e2e_settings"
    evaluation = env.get("INTELLILMS_SQLITE_EVALUATION") == "1"
    source = env.get("INTELLILMS_CONFIG_SOURCE", "root")
    if source not in {"root", "environment"}:
        raise ImproperlyConfigured("INTELLILMS_CONFIG_SOURCE must be root or environment.")
    configured = dotenv_values(path) if Path(path).is_file() else {}
    # Normal local API/commands share the root file. A conflicting inherited value
    # fails before any DB connection, rather than silently selecting another store.
    if source == "root" and not testing:
        ignored = {"DB_ENGINE", "SQLITE_NAME", "EMAIL_BACKEND"} if evaluation else set()
        conflicts = [key for key in CONNECTION_KEYS if key not in ignored and key in env
                     and configured.get(key) is not None and env[key] != configured[key]]
        if conflicts:
            raise ImproperlyConfigured(
                "Inherited configuration conflicts with root .env: " + ", ".join(conflicts)
                + ". Start a fresh terminal or clear these overrides. "
                "Intentional deployments may select INTELLILMS_CONFIG_SOURCE=environment. "
                "Values are withheld; no configuration or database was changed."
            )
    if environ is None:
        load_dotenv(path, override=False)
    else:
        for key, value in configured.items():
            if value is not None:
                env.setdefault(key, value)
    engine = env.get("DB_ENGINE", "postgresql")
    if engine not in {"postgresql", "sqlite"}:
        raise ImproperlyConfigured("DB_ENGINE must be postgresql or explicitly isolated sqlite; no fallback is supported.")
    if engine == "sqlite" and not testing:
        name = env.get("SQLITE_NAME", "")
        if not evaluation or not name or Path(name).name.lower() == "db.sqlite3":
            raise ImproperlyConfigured(
                "SQLite requires INTELLILMS_SQLITE_EVALUATION=1 and an explicit SQLITE_NAME "
                "for a separate evaluation database. The historical db.sqlite3 is protected."
            )
    return "test" if testing else "evaluation" if evaluation else source if Path(path).is_file() else "environment"


def database_identity(database):
    """An operator-facing identity, never a DSN, password or username."""
    if database["ENGINE"] == "django.db.backends.sqlite3":
        return f"sqlite:{database['NAME']}"
    return f"postgresql:{database.get('HOST', '')}:{database.get('PORT', '')}/{database['NAME']}"
