# IntelliLMS

A working multi-institute learning platform built with Django 5.2, DRF, React, TypeScript, Vite, and a reproducible scikit-learn experiment. The deployment database is PostgreSQL. A deliberately selected SQLite mode is available for local evaluation.

**Learning Insights (19 October):** [root cause, role workflow, corrections and test results](docs/learning-insights-20261019.md). Institute Admin remains read-only. Older-model predictions are preserved separately from the active OULAD risk counts; the page now explains coverage and provides the authorized teaching workflow. Latest verification: 249 PostgreSQL tests, 75 frontend tests and 10 selected Chromium workflows passed.

**Developer navigation:** [complete handbook and file maps](docs/README.md) · [where to edit a feature](docs/WHERE_TO_EDIT.md).

**Database split (18 October):** [verified backups, reconciliation dry run, startup safeguards and SMTP evidence](docs/database-mismatch-20261018.md). Both databases contain unique working data. PostgreSQL is the normal serving database; SQLite is preserved for a separately approved reconciliation. No automatic merge or fallback occurs.

**Approved target recovery:** the reported account and its department, Head membership, invitation and 21 audit entries have now been recovered into PostgreSQL with their original IDs. Existing records remain unchanged. No email was sent; broader reconciliation and real invitation sending still require separate approval. [Recovery verification](docs/database-mismatch-20261018.md#approved-target-recovery).

**Invitation delivery (18 October):** [investigation, delivery states and safe verification steps](docs/invitation-delivery-20261018.md). Use `python backend/manage.py check_invitation_delivery --email '<recipient-email>'` to inspect the selected configuration/account without sending mail. Legacy backend acceptance does not prove SMTP delivery; keep development processes on one intended database/configuration.

**Current architecture and real-public-data ML integration are verified locally (16 October 2026).** School/college/university adaptation, reviewed academic progression/history, scoped reporting, explicit provisional university GPA/CGPA and role governance are implemented. The existing ML workflow now uses a versioned OULAD model with visible external-evaluation limitations and retained historical predictions. **189 PostgreSQL tests, 59 frontend tests and all 50 Chromium workflows passed**, along with typecheck/build, Django checks, migration-drift checks and warning-free OpenAPI validation. These full runs supersede earlier overlapping focused checkpoints; counts are not cumulative.

Requirements: [academic architecture request](docs/ARCHITECTURE_REQUEST.md) and [real-public-data ML request](docs/REAL_DATA_ML_REQUEST.md). Evidence and boundaries: [acceptance matrix](docs/completion-acceptance.md), [limitations](docs/limitations.md), [implementation progress](IMPLEMENTATION_PROGRESS.md). No known required functional gap remains in the current matrix; public production acceptance, broader assurance and real-student ML validation remain open. Results/GPA use current rules and are provisional, not immutable official transcripts.

Historical original-scope verification (11 October): **74 backend tests passed / four PostgreSQL-only skipped, 25 frontend tests passed, 20 Chromium workflows passed together**; typecheck/build, Django checks, migration drift and OpenAPI validation passed. Existing PostgreSQL/Docker/production smoke evidence was not repeated. See the latest progress handoff for exact scope and remaining operational work.

Historical stability verification (14 October): **136 PostgreSQL tests, 45 frontend tests and all 35 Chromium workflows passed**. Typecheck, build, Django checks, migration drift and OpenAPI validation passed. See [targeted fixes and remaining boundaries](docs/stability-20261014.md). This describes the earlier stability checkpoint; the current architecture results above supersede its unfinished-work status.

## Recovered local database

The 12 October recovery preserved the existing records and moved them from SQLite into PostgreSQL. The ignored root `.env` selects the recovery database at `127.0.0.1`; use normal startup without `-SQLite`. See [historical recovery evidence](docs/database-recovery-20261012.md). The 18 October investigation found subsequent writes in **both** databases. SQLite remains preserved and contains records missing from PostgreSQL; the [current reconciliation report](docs/database-mismatch-20261018.md) supersedes the assumption that it is merely a historical copy.

## Local startup: Windows PowerShell

Run from this repository root. Python 3.12+ and Node 24 are required for the verified setup.

```powershell
# Standard PostgreSQL development setup (requires Docker Desktop)
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d db
powershell -ExecutionPolicy Bypass -File scripts/setup-local.ps1 -Demo

# Terminal 1
powershell -ExecutionPolicy Bypass -File scripts/start-backend.ps1

# Terminal 2
cd frontend
npm.cmd run dev
```

Without Docker/PostgreSQL, use the explicit local evaluation mode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-local.ps1 -SQLite -Demo
powershell -ExecutionPolicy Bypass -File scripts/start-backend.ps1 -SQLite -Port 8002
# In a second terminal, from the repository root:
$env:VITE_API_TARGET='http://127.0.0.1:8002'
npm.cmd --prefix frontend run dev
```

The setup script creates `.env` if absent, installs locked dependencies, migrates, and only seeds fictional accounts when `-Demo` is supplied. It never overwrites an existing `.env`.

Normal commands and the API reject inherited database/mail/frontend settings that conflict with root `.env`. The error lists variable names only. Clear the named overrides or use a fresh terminal; do not replace your credentials. Intentional deployments/benchmarks using injected settings can explicitly select `INTELLILMS_CONFIG_SOURCE=environment`; deployments without a root `.env` naturally use their injected environment. Isolated pytest/E2E settings remain separate. SQLite evaluation uses `evaluation.sqlite3`, a separate port and a local mail backend; the preserved `db.sqlite3` is protected from normal startup. A second backend for the same checkout/port is rejected, and Vite refuses to silently choose another port.

## Local startup: Linux / macOS

```bash
test -f .env || cp .env.example .env
docker compose up -d db
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.lock.txt
python backend/manage.py migrate
python backend/manage.py seed_demo
python backend/manage.py runserver 127.0.0.1:8000
# Second terminal
cd frontend
npm ci
npm run dev
```

For isolated SQLite evaluation, export `INTELLILMS_SQLITE_EVALUATION=1`, `DB_ENGINE=sqlite`, `SQLITE_NAME=evaluation.sqlite3`, `DEBUG=True` and `EMAIL_BACKEND=django.core.mail.backends.locmem.EmailBackend`; serve on port 8002 and set frontend `VITE_API_TARGET=http://127.0.0.1:8002`. PostgreSQL behavior must still be tested before deployment.

## Addresses

| Application | URL |
|---|---|
| Frontend and proxied API | http://127.0.0.1:5173 |
| Backend health | http://127.0.0.1:8000/health/ |
| OpenAPI / Swagger (signed-in users) | http://127.0.0.1:5173/api/docs/ |
| Django platform admin | http://127.0.0.1:8000/admin/ |

Use a consistent host (`127.0.0.1` or `localhost`) so cookies stay on the same origin. Select an institute in the sidebar after signing in as Super Admin.

The table shows example defaults. Vite now derives its normal port from root `FRONTEND_URL`; this workspace's existing setting is **http://127.0.0.1:5174**. `/api` and `/health` proxy to port 8000 unless an explicit test/evaluation `VITE_API_TARGET` is supplied. Stop an obsolete frontend before starting the intended one; port conflicts now fail instead of silently moving invitation links to another instance.

## Explicitly seeded demo accounts

All newly seeded accounts use **`LearnTogether42!`**. Seeding refuses `DEBUG=False` and does not overwrite existing institutes or passwords.

| Role | Username |
|---|---|
| Super Admin | `superadmin` |
| Institute Admin | `university.admin` |
| Department Head | `university.head` |
| Teacher | `university.teacher` |
| Student | `university.student` |

Replace `university` with `school` or `college` for the other fictional institutes. Additional students are `university.student2` through `university.student12`. Never seed a production database.

## Machine learning

The active experimental model now uses **real public OULAD data (CC BY 4.0)**: 50,815 chronological assessment sequences from 18,136 students. It predicts the next submitted assignment scoring below 40% using two preceding released assignment percentages; attendance, quiz and activity values remain separate academic context.

```powershell
cd backend
..\.venv\Scripts\python.exe -m ml.train --oulad
```

Histogram gradient boosting was selected by student-disjoint validation F1. Held-out precision **0.3353**, recall **0.3801**, F1 **0.3563**, ROC-AUC **0.8215**; this limited performance is not validation on IntelliLMS students. No automatic academic decisions. Missing/incompatible observations yield an explicit unavailable state. Existing synthetic history remains labeled. [Methods/source/license and isolated browser demo](docs/ml-methodology.md) · [all measured metrics](docs/model-evaluation.md).

## Verification

```powershell
$env:DEBUG='True'
$env:SECRET_KEY='local-test-only-secret'
$env:DB_ENGINE='postgresql'
$env:POSTGRES_HOST='127.0.0.1'
.\.venv\Scripts\python.exe backend\manage.py check
.\.venv\Scripts\python.exe backend\manage.py makemigrations --check --dry-run
cd backend
..\.venv\Scripts\python.exe -m ml.train --oulad
..\.venv\Scripts\python.exe -m pytest
cd ..\frontend
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

The Playwright launcher uses Python, ports 8001/5174, and a new `backend/test-results/e2e-runs/run-*/e2e.sqlite3` database for each invocation. It refuses an existing database and never flushes existing data. Test databases are retained for inspection. Other platforms can supply equivalent isolated servers; see [testing](docs/testing.md). A GitHub Actions configuration runs backend tests against PostgreSQL, but it has not been executed in this workspace.

## Implementation

- Five roles, session cookies, CSRF, password reset/change, institute selection, and scoped membership management.
- Academic hierarchy, years, terms, programs, sections, course definitions, offerings, teacher assignments, and enrollments.
- Published lessons, completion, private learning files, assignment supporting resources, private submissions, feedback and grade release.
- Timed quizzes, question banks, attempt limits, MCQ/boolean grading, and manual short-answer grading.
- Bulk attendance, provisional weighted grades, CSV report export, timetable conflict checks.
- Announcements, quiz/assessment release notifications, idempotent deadline reminders, staff grade history, scoped progress trends, department summaries and instructor workload.
- CSV invitations with validation and downloadable error details; experimental ML training/inference.

See [documentation index](docs/index.md) and [deployment instructions](docs/deployment.md). PostgreSQL and production Docker images with disposable TLS were verified locally. Actual SMTP and public deployment remain unverified.


## Historical completion continuation

This earlier checkpoint implemented [the completion request](docs/COMPLETION_REQUEST.md); the current architecture and public-data ML requirements are linked above. Department Heads have explicit department-management and personal-teaching workspaces; teaching requires capability and a current authorized assignment. Institute settings support audited released-grade protection and an attendance editing window. Academic progress includes paginated course comparisons with recorded attendance, released assignment statistics and missing work; extended report filters support program, year, section and batch. Current verification is recorded at the top of [IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md); checkpoint counts below are historical.

Institute settings now control singular/plural academic terminology, grade bands/points, repeated quiz attempts and missing-category treatment. Gradebook and saved prediction history are paginated; gradebook filters also apply to streaming CSV exports. Super Admin can open `/platform` at any time and inspect an institute's administrators. School/college/university academic tests cover duplicate prevention and term-aware scheduling. See IMPLEMENTATION_PROGRESS.md for verified checks and remaining work; PostgreSQL/Docker verification now passes; external operational checks remain separate.


## Historical deployment verification

PostgreSQL 17: 73 tests passed (including four concurrency tests). SQLite: 69 passed, four PostgreSQL-only skipped. Frontend: 19 component tests and 17 Chromium workflows passed; production build/typecheck passed. Production PostgreSQL/Gunicorn/Nginx images built and isolated TLS/readiness/access-control/rate-limit smoke passed. Database backup/restore and a 2,000-student reporting benchmark passed. See [testing](docs/testing.md) and [limitations](docs/limitations.md) for exact scope.

Run `python scripts/verify-containers.py` with Docker Compose/OpenSSL when production smoke needs repeating. It preserves production configuration and removes its disposable containers/volumes. Remaining operational and ML validation boundaries are documented above; these historical results are not a production security or ML validation claim.

Latest additions include paginated attendance with recorded statuses and retry-safe page edits, contextual student attendance history, typed auth/report contracts, bounded filter/institute selectors, SQL department counts and a fix for rapid combined URL-filter changes.
