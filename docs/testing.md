# Testing and verification

Local verification uses Windows, Python 3.12.10, Node 24.14.1, explicit SQLite and Chromium. PostgreSQL is the deployment target; its CI job is configured but has not been executed here. Docker, TLS, external SMTP and multi-worker concurrency remain unverified.

## Commands

From the repository root in PowerShell:

```powershell
$env:DEBUG='True'
$env:SECRET_KEY='local-test-only-secret'
$env:DB_ENGINE='sqlite'
.\.venv\Scripts\python.exe backend\manage.py check
.\.venv\Scripts\python.exe backend\manage.py makemigrations --check --dry-run
Set-Location backend
..\.venv\Scripts\python.exe -m pytest -q
..\.venv\Scripts\python.exe manage.py spectacular --file openapi.yaml --validate
Set-Location ..\frontend
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Use `backend/requirements-dev.txt` for development tooling. Backend tests use an isolated pytest database; E2E uses `backend/e2e.sqlite3`, flushes only that explicitly named test database, and reseeds fictional data. Its servers use ports 8001 and 5174, separate from the interactive demo. Do not point this test launcher at an existing database. The Python launcher selects the local virtual environment when present; otherwise set `E2E_PYTHON` or provide Python on PATH. It fixes the isolated SQLite database path regardless of inherited environment variables. Windows execution is tested; Linux browser CI is configured.

## Coverage

- Authentication, CSRF rejection, session selection, password change/reset, membership status and tenant isolation.
- Teacher assignment, head department boundaries, student ownership, unpublished content, private downloads and upload signatures.
- Assignment deadlines, resubmissions, grading and release without changing the submission timestamp.
- Quiz timing/attempt limits, saved answers after expiry, automatic and short-answer grading, locked questions.
- Atomic attendance and CSV import, weighted/manual results, question bank scope and copies, idempotent reminders.
- ML training/evaluation, missing or corrupt trusted artifacts, insufficient input and successful inference metadata.
- Gradebook query count as enrollment grows, suppressed unreleased grades, trend scope and latest-per-student/course risk summaries.
- Attachment access, quiz release notifications and staff grade-history access.
- Super Admin directory restrictions, account disabling and existing-session rejection, protected administrator accounts, existing-user linking and audit records.
- React form/action states, permissions/navigation and more-than-50-record pagination.
- Chromium: administrator structure and enrollment; teacher lesson/assignment creation; student completion/submission; grade release and feedback; timed quiz submission. Additional progress, release-edit, membership-edit and cross-institute account-linking browser checks passed.

## Recorded results

On 10 October 2026, the full backend suite passed **30 tests** in 117.24 seconds. Frontend tests passed **10 tests**. **Six distinct Chromium workflows passed across the final regression runs**: five passed together, and the platform-account linking case passed separately after a development hot reload interrupted its earlier login. There are no remaining failing test cases.

Django system checks and migration-drift checks passed. OpenAPI was generated without errors or warnings. A production frontend bundle was built successfully. Desktop (1440 px) and mobile (390 px) previews were inspected; the baseline dashboard had no horizontal overflow or browser JavaScript errors. ML demo metrics are in model-evaluation.md and do not establish real-world predictive validity.

## Remaining validation

Run the configured hosted CI jobs, exercise actual SMTP and off-host/media recovery procedures, and expand browser coverage to Firefox/WebKit and additional role/CRUD permutations. Local PostgreSQL concurrency and production containers now pass. The automated suite is meaningful regression evidence, not an exhaustive security or accessibility audit.


## Continuation verification (11 October 2026)

Focused checks passed: 14 security tests; 15 grading/configuration/reporting/administration tests; 13 pagination/reporting/workflow tests; four academic/platform tests covering school, college and university. These sets overlap; do not add their totals as a unique test count. Frontend build/type checking and 12 component tests passed after integration. Full-suite and browser results are recorded in IMPLEMENTATION_PROGRESS.md after execution.

The PostgreSQL-only concurrent quiz-start test must skip on SQLite. To execute against a dedicated PostgreSQL service, configure POSTGRES_* and run `python scripts/verify-postgres.py` using the installed project Python. The launcher forces PostgreSQL; pytest creates its separate test database, requiring CREATEDB permission. It never silently falls back to SQLite. Do not target production credentials. The normal CI backend job uses PostgreSQL 17; a separate Linux browser job exercises isolated SQLite.


The isolated `config.e2e_settings` increases only the browser-test login rate because the suite switches many accounts from one IP. It refuses to run outside DEBUG SQLite with the named `e2e.sqlite3` database. Ordinary application settings retain the real login throttle; security tests use those ordinary settings.

A separate `containers.yml` CI workflow builds production images, initializes migrations/static files, runs PostgreSQL/Gunicorn/Nginx with disposable TLS, and checks readiness, anonymous access denial and edge 429 responses. YAML parsing and local production-container execution passed; hosted CI execution remains unverified. The job has no deployment or external messaging steps.


Final continuation result: **52 backend tests passed and one PostgreSQL-only test skipped in 154.19 seconds**; **12 frontend tests passed**; **12 distinct Chromium workflows passed** (11 in the final full browser run and one focused ML learner-selector test afterward). No failing test remains. Production frontend build/typecheck, Django checks, migration-drift check and OpenAPI validation passed. Local desktop/mobile smoke checks reported no JavaScript errors or document overflow; visual review prompted and verified wrapping of role shortcuts. Refreshed screenshots are in docs/images. SQLite is the only database runtime verified in this session.


## Latest verified result (11 October 2026, later continuation)

PostgreSQL 17: **66 passed, no skips (214.94s)**. SQLite: **62 passed, 4 PostgreSQL-only skips (228.16s)**. Frontend: **16 passed**, production build/typecheck passed. Chromium: **16 passed together (1.8m)**. Checks, migration drift and OpenAPI validation passed. Docker became available during the session: production container smoke and isolated database restore both passed. The prior missing-runtime notes are historical.

The four PostgreSQL-only tests cover simultaneous quiz starts, question edit versus start, duplicate first submissions and grading versus resubmission, and overlapping room bookings. SQLite deterministic tests separately cover stale assessment preconditions and term-date conflict validation. Explicit assessment payload tests reject coercion/truncation, nonfinite marks and nontext answers.

`python scripts/verify-containers.py` runs the isolated production smoke with temporary secrets/TLS and cleans its own containers/volumes. `python scripts/benchmark-reporting.py --students 2000` requires an empty PostgreSQL database named `intellilms_benchmark` and refuses other databases or existing tables. Configure POSTGRES_* before running. It creates fictional records, verifies page/CSV counts and reports times/SQL counts. It intentionally leaves fixture data for inspection; use a disposable database/container. Recorded measurements: [reporting-benchmark.json](reporting-benchmark.json).

Browser coverage additionally verifies unauthorized pages never load their private API, global platform audit access without a tenant, workload scope/search, and course selectors reaching beyond 50 records while retaining selection. Desktop/mobile dashboard and selector previews passed without JavaScript errors or horizontal overflow. Remaining production, model-governance and exhaustive-coverage limits are in limitations.md.


## Latest backend and reporting verification

After typed authentication/invitation validation, prediction archive filtering, department SQL counts, explicit report contracts and paginated attendance integration, the complete PostgreSQL 17 suite passed **73 tests with no skips in 391.23s**. SQLite passed **69 tests with four PostgreSQL-only skips in 369.15s**. Both used isolated test databases, concurrent with other verification. System checks, migration drift and OpenAPI validation passed. No migrations were needed for these changes.

The attendance API tests cover 52 active enrollments across two pages, inactive exclusion, saved statuses, search, bounded query count, tenant/course/head/student denials and atomic rejection of invalid mixed batches. Response contracts are checked against real role-scoped API responses. The frontend failed-save test verifies that edits remain available for retry and only displayed learners are submitted.

The combined browser suite exposed a real rapid-filter navigation race: setting active status before the role URL committed discarded role. A queued URL-edit hook now composes pending edits; its regression covers rapid additions/removals and navigation to a different report. Final browser totals are recorded after rerunning the unchanged workflow assertion.

The updated 2,000-student reporting benchmark verifies 25/100-row pages and a complete CSV export. Database aggregation replaces whole-cohort Python sets. Single-run timings increased while full regression/container work shared the machine; compare SQL counts and test conditions, not these timings as an isolated before/after performance claim.

Final frontend/browser follow-through: **19 component tests passed**, TypeScript and production build passed; **all 17 Chromium workflows passed together in 2.1 minutes**, including the unchanged rapid-filter assertion and teacher-to-student attendance workflow. Production Docker smoke passed again after the filter fix. Responsive dashboard/attendance previews passed with no JavaScript errors or horizontal overflow. The final visible-input styling correction was separately typechecked, component-tested, built and visually previewed.
### Commands and actual results

- Explicit SQLite isolated test database: `python manage.py check` passed; `python manage.py makemigrations --check --dry-run` reported no changes; `python manage.py spectacular --validate --fail-on-warn --file schema.yml` passed without warnings.
- Full `python -m pytest -ra`: **74 passed, 4 PostgreSQL-only skipped, 221.49 seconds**. The four skipped concurrency cases require PostgreSQL row locks and passed in the preceding PostgreSQL run. This session did not re-run PostgreSQL, Docker or production smoke, as requested.
- Focused backend milestones: 10 invitation/administration/order/scope tests passed; 3 response-contract tests passed. These overlap the full-suite total and must not be added to it.
- `npm run typecheck`, `npm test`, `npm run build`: passed; **25 frontend tests**. Six new tests cover quiz draft/error/in-flight save behavior, decimal manual scores, released feedback and saved short-answer grades.
- Full `npm run test:e2e`: **20 Chromium workflows passed together in 2.3 minutes**. The initial run had 17 passes and three new-test selector failures; selectors were corrected to existing accessible control names and all 20 then passed. No application assertions were removed.
- Existing local backend health at 8000 and SPA login at 5173 returned HTTP 200. No existing application database or user data was reset. Only the guarded, disposable E2E database is rebuilt by the existing test launcher.
- No model migration was needed. Existing untracked repository content was preserved; no blanket staging/commit or redesign was performed.

