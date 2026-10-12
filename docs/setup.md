# Setup guide

Use the exact platform-specific commands in the root README. `scripts/setup-local.ps1` supports PostgreSQL by default and explicit `-SQLite` evaluation. `-Demo` is required to enable demo accounts.

Configuration loads root `.env` with python-dotenv; process environment takes precedence. Required production values are SECRET_KEY, database credentials, ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS, frontend URL, and email configuration. DEBUG defaults to false and an absent secret stops startup.

The local email backend prints reset/invitation email to the backend terminal. It is intentionally a development transport, not evidence of delivered email. Accounts created in the UI receive a set-password link; no permanent plaintext password is emailed. Demo credentials are separately set only by the explicit seed command.

If port 8000 or 5173 is occupied, stop the owned process or choose ports and adjust the Vite proxy/CSRF origins. Do not confuse `localhost` cookies with `127.0.0.1` cookies. The frontend must reach the API through its proxy so session and CSRF cookies share an origin.

For a clean non-demo installation: migrate, run `python manage.py createsuperuser` inside backend, sign in, create an institute, select it, and invite its institute administrator. There is no public registration.

Seed data uses the current local academic year, relative assignment windows, and deterministic fictional performance. Existing institute codes are skipped; re-running seeding does not destroy edits. Model artifacts are generated separately with `python -m ml.train --demo`.
