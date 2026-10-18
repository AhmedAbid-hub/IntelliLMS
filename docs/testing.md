# Testing and verification

Current verification uses Windows, Python 3.12.10, Node 24.14.1, PostgreSQL and Chromium. Browser fixtures use explicitly isolated SQLite. Local PostgreSQL/concurrency and prior Docker smoke have passed; hosted CI, actual SMTP and public-domain operations remain separate. Historical checkpoints below retain their dates; consult IMPLEMENTATION_PROGRESS.md for the current result.

## Commands

From the repository root in PowerShell:

```powershell
$env:DEBUG='True'
$env:SECRET_KEY='local-test-only-secret'
$env:DB_ENGINE='postgresql'
$env:POSTGRES_HOST='127.0.0.1'
.\.venv\Scripts\python.exe backend\manage.py check
.\.venv\Scripts\python.exe backend\manage.py makemigrations --check --dry-run
Set-Location backend
..\.venv\Scripts\python.exe -m ml.train --oulad
..\.venv\Scripts\python.exe -m pytest -q
..\.venv\Scripts\python.exe manage.py spectacular --file openapi.yaml --validate
Set-Location ..\frontend
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Use `backend/requirements-dev.txt` for development tooling. Backend tests use an isolated pytest database; E2E creates a fresh `backend/test-results/e2e-runs/run-*/e2e.sqlite3`, refuses an existing database and seeds only that new fictional fixture. No existing database is flushed. Its servers use ports 8001 and 5174, separate from the interactive demo. Do not point this test launcher at an existing database. The Python launcher selects the local virtual environment when present; otherwise set `E2E_PYTHON` or provide Python on PATH. It fixes the isolated SQLite database path regardless of inherited environment variables. Windows execution is tested; Linux browser CI is configured.

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

## Historical recorded results — 10 October 2026

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



## Current browser isolation (14 October 2026)

`npm --prefix frontend run test:e2e` allocates a fresh `backend/test-results/e2e-runs/run-*/e2e.sqlite3` and initializes fictional fixtures there. The launcher refuses existing database files and paths outside that test directory. It does not flush the historical `backend/e2e.sqlite3` or use the live database. Auth fault controls require the same exact run directory. Evidence goes to ignored `frontend/test-results/evidence/`; test databases are retained for inspection. Historical results above are dated checkpoints, not certification of subsequent concurrent edits.

## Final stability verification (14 October 2026)

- PostgreSQL `python -m pytest -ra --junitxml=test-results/stability-postgres-complete.xml`: **136 passed, no skips/failures, 604.84 seconds**, including all nine concurrency cases.
- Frontend `npm run typecheck`, `npm test`, `npm run build`: passed; **45 component tests (19.06 seconds)**. The existing >500 kB main-chunk warning remains.
- Full `npm run test:e2e`: **35 Chromium workflows passed together (5.5 minutes)**, including all five roles, own-department Head approval without delegation, modal dropdown keyboard/mouse access at 390/1280px, invitations, linking, audited enrollment, assessment/attendance, transfer history, reporting and experimental batch controls.
- `manage.py check --database default`, `makemigrations --check --dry-run` and `spectacular --validate --fail-on-warn`: passed; no migration changes.
- Local backend health and SPA login returned HTTP 200 at ports 8000/5173. Existing application data and concurrent developer changes were preserved. Docker production smoke was not repeated; browser fixtures use explicitly isolated SQLite and do not establish production deployment acceptance.

Earlier diagnostics, corrected failures, test ownership and remaining scope are detailed in [the stability report](stability-20261014.md). ML remains synthetic and unvalidated for real student decisions.


## Current architecture verification — 15 October 2026

Latest relevant verification, with overlapping focused runs kept separate:

| Check | Executed result |
|---|---|
| PostgreSQL full `python -m pytest -o addopts='' -q --tb=short` | **181 passed**, no skips/failures, **915.43s**; `backend/architecture-postgresql-complete.log` |
| Subsequent platform count/account/response contracts | **6 passed**, **29.65s**; `backend/architecture-platform-contract-final.log` |
| Targeted period/GPA/reporting before full suite | **16 passed**, **60.20s**; included in subsequent full verification |
| Frontend typecheck, Vitest, build | Passed; **56 tests / 8 files**, latest **19.49s**. Existing ~553 kB main-chunk warning remains. |
| Chromium full `npm run test:e2e -- --reporter=line` | **49 passed (8.5m)**; `frontend/architecture-browser-complete.log` |
| Subsequent GPA-settings form and mobile focus/visibility acceptance | **9 passed (3.0m)**; `frontend/architecture-browser-final-focused.log` |
| Subsequent platform count UI | **1 passed (56.9s)**; `frontend/architecture-browser-platform-final.log` |
| Final seven role/type desktop/mobile cases | **7 passed (44.8s)**; `frontend/architecture-browser-roles-final.log`; screenshots retained in `backend/test-results/architecture-ui/` |
| Django checks / migration drift / OpenAPI | Passed; `check --database default`, `makemigrations --check --dry-run`, `spectacular --validate --fail-on-warn --file ../docs/openapi.yaml` |
| Live local app | `/ready/` returned ready via PostgreSQL; SPA `/login` returned HTTP 200 at port 5173. Hidden development processes left running. |

The full backend run preceded the small platform-count addition; its six follow-up tests verify that addition and generated response contracts. The full browser run preceded the mobile focus/count/GPA-form acceptance strengthening; affected follow-up journeys passed. No full-suite success is substituted for changes made afterward without relevant follow-up verification.

Fresh school/college/university journeys create isolated institutes and invitation-activated accounts, configure structures, teach, release grades/attendance, transfer/progress and inspect retained results. University policy is explicitly saved through the actual settings form and the learner sees the computed CGPA. No real SMTP, public deployment or real-student ML validity is claimed.

One focused attempt initially produced 12 PostgreSQL connection setup errors after the existing Docker DB container had stopped. It was restarted without recreating volumes; subsequent PostgreSQL runs passed. Intermediate frontend assertions needed unique updated filter labels; final 56 passed. Reviewed screenshots found a hidden-sidebar keyboard issue and the missing platform administrator metric; both received working fixes and successful browser/API retests.

No existing application database was flushed, reset or seeded. Browser runs use fresh guarded SQLite test directories; backend verification uses the PostgreSQL test database. Migration 0008 was verified separately against the recovered live database without changing recorded preexisting counts. Historical deployment smoke was not unnecessarily repeated.


## Public-data ML verification — 16 October 2026

Prepare the pinned public artifact first with `python -m ml.train --oulad` from backend. The public-data regression intentionally requires the verified OULAD data and trained artifact; it does not silently skip or substitute synthetic data. Tests use pytest's isolated PostgreSQL database. CI configuration trains the same artifact before backend and browser tests; hosted execution remains unverified.

Focused suite: `pytest tests/test_public_model.py tests/test_ml.py tests/test_class_analysis.py tests/test_auth_and_inference.py tests/test_reporting.py tests/test_response_contracts.py` — **21 passed (91.86s)**. It exercises the real joblib model, schema/checksum/unavailable/missing-input cases, chronological extraction, future/banked/missing-record exclusion, exact LMS-to-model mapping, active membership and instructor/tenant denials, batch deduplication, history preservation and version-aware summaries. The first run's two exact float comparisons were corrected by doing percentage arithmetic in Decimal before conversion. A new UI unit test initially lacked cleanup; fixed without changing application behavior.

Final frontend typecheck, **59 Vitest tests / 9 files (27.40s)** and build passed, including read-only oversight controls. The existing approximately 553 kB main-chunk advisory remains. Full Chromium regression: **50 passed (8.6m)**, recorded in `frontend/real-data-browser-final.log`. Browser demo uses `e2e/real-data-ml.spec.ts` and the path-guarded `scripts/e2e-public-model-fixture.py`. Existing fictional marks are retained, with compatible past dates only in that isolated fixture. The test drives actual teacher Analyze Class and individual generation, checks version/input values, reloads history and captures screenshots. Final screenshots under `backend/test-results/real-data-ml/` were visually reviewed; prediction evidence is readable in the existing dialog.

The first full Chromium attempt finished with 48 passes and two test-expectation failures (a locator from before the provenance dialog change and an existing mobile test waiting for hidden navigation). Both were corrected before the clean 50-test run. An overnight interruption stopped the earlier full PostgreSQL run at 38%; it is not counted as a pass. The existing database container was restarted without recreating its volume. The clean full PostgreSQL `python -m pytest -vv` run finished with **189 passed, no skips/failures, 814.80 seconds**, recorded in `backend/real-data-postgresql-final.log`. This includes the subsequent Head teaching-workspace/capability test and all PostgreSQL concurrency cases. Only documentation and an explanatory source comment changed after test execution began; no tested behavior changed.

Final Django database checks, migration-drift check and warning-free OpenAPI validation passed. Live `/ready/` returned ready and the SPA login returned HTTP 200. Read-only live counts remain 17 predictions, 217 submissions, 540 attendance records and 108 enrollments; active model version is `oulad-a90f43b47bbf0041`. Full regressions supersede the earlier overlapping focused runs; counts are not added together. No production deployment or authorized local-cohort ML validation is claimed.
