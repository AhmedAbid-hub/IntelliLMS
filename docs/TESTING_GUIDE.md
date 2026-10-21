# Testing the reorganized application

The detailed test directory and troubleshooting instructions remain in [TESTING_AND_DEBUGGING_GUIDE.md](TESTING_AND_DEBUGGING_GUIDE.md) and [testing.md](testing.md). Current executed evidence, including failures and reruns, belongs in [refactoring/PROGRESS.md](refactoring/PROGRESS.md).

## Backend

Confirm the local Compose configuration and selected PostgreSQL database before running commands. The following checks do not apply migrations:

```powershell
.\.venv\Scripts\python.exe backend/manage.py check
.\.venv\Scripts\python.exe backend/manage.py showmigrations --plan
.\.venv\Scripts\python.exe backend/manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe scripts/generate_developer_reference.py --check --verify-postgres
```

Run pytest against a **separate test database**, never by resetting the application database:

```powershell
$env:DB_ENGINE='postgresql'
$env:EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'
cd backend
..\.venv\Scripts\python.exe -m pytest
```

Pytest's normal Django database creation uses a test database. Inspect test settings and avoid `--reuse-db` against an unexplained existing database. The session's full runs use a unique test database name and a fast hasher only in that test process. Normal application password hashing is unchanged. Clear test-only environment overrides before starting the normal backend.

The suite covers CRUD, denied roles, cross-institute references, independent correction reviewers, Head workspaces, school/college/university structures, invitations, admissions, assessments, attendance, reporting, concurrency and ML. Generated API comparison must include paths, methods, parameters and schemas, not only route counts.

## Frontend and browser

```powershell
cd frontend
npm.cmd run typecheck
npm.cmd test -- --maxWorkers=2
npm.cmd run build
$env:E2E_FRONTEND_PORT='6174'
$env:E2E_BACKEND_PORT='8101'
npm.cmd run test:e2e
```

The Playwright launcher creates a new guarded SQLite database for each browser invocation and captures mail locally. This is explicitly isolated browser verification; it is not a substitute for PostgreSQL-backed pytest. Existing databases are never flushed. Browser failure logs/traces may contain fictional setup tokens and stay ignored.

Baseline and comparison screenshots cover five roles and three institution types at desktop/mobile widths. Compare fresh equivalent fixtures; tests earlier in a full run can change fictional counts. CSS/source integrity and API-contract comparisons complement screenshots.

## Documentation

`generate_developer_reference.py --check` detects stale generated table/relationship/API documents and refuses SQL during generation. Optional PostgreSQL metadata verification is read-only. [verify_developer_docs.py](../scripts/verify_developer_docs.py) checks local links, anchors, route entry coverage and source paths once the handbook is updated.

Do not run model training merely to verify a source refactor. Existing inference tests exercise the preserved artifact.
