"""Isolated browser testing only; production imports config.settings."""

from .settings import *  # noqa: F403

if (
    not DEBUG
    or DATABASES["default"]["ENGINE"] != "django.db.backends.sqlite3"
    or Path(DATABASES["default"]["NAME"]).name != "e2e.sqlite3"
):
    raise RuntimeError(
        "E2E settings require DEBUG and the isolated e2e.sqlite3 database"
    )

# Browser workflows deliberately perform many account changes from one test IP.
# Authentication/security pytest cases continue to use the real default rate.
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {"login": "1000/min"}}

# Capture only isolated test invitations for browser acceptance tests. Never send
# test account details through a developer's configured SMTP provider.
EMAIL_BACKEND = "config.e2e_mail.EmailBackend"
EMAIL_FILE_PATH = BASE_DIR / "test-results" / "e2e-mail"
