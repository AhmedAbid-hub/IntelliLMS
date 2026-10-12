# IntelliLMS

A working multi-institute learning platform built with Django 5.2, DRF, React, TypeScript, Vite, and a reproducible scikit-learn experiment. The deployment database is PostgreSQL. A deliberately selected SQLite mode is available for local evaluation.

**The improvement upgrade is in progress.** The original baseline results below are historical; current requirements are in [the final unified master request](docs/FINAL_UNIFIED_REQUEST.md). See [current requirement audit](docs/audit-current.md), [limitations](docs/limitations.md), and [implementation progress](IMPLEMENTATION_PROGRESS.md) for verified milestones and remaining work. Production acceptance and real-world ML validation remain incomplete.

Historical original-scope verification (11 October): **74 backend tests passed / four PostgreSQL-only skipped, 25 frontend tests passed, 20 Chromium workflows passed together**; typecheck/build, Django checks, migration drift and OpenAPI validation passed. Existing PostgreSQL/Docker/production smoke evidence was not repeated. See the latest progress handoff for exact scope and remaining operational work.

## Recovered local database

The 12 October recovery preserved the existing records and moved them from SQLite into PostgreSQL. The ignored root `.env` selects the verified recovery database at `127.0.0.1`; use normal startup without `-SQLite`. See [recovery evidence and backups](docs/database-recovery-20261012.md). The original SQLite file is preserved but is no longer the live database.

## Local startup: Windows PowerShell

Run from this repository root. Python 3.12+ and Node 24 are required for the verified setup.

```powershell
# Standard PostgreSQL development setup (requires Docker Desktop)
Copy-Item .env.example .env
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
powershell -ExecutionPolicy Bypass -File scripts/start-backend.ps1 -SQLite
# In a second terminal, from the repository root:
npm.cmd --prefix frontend run dev
```

The setup script creates `.env` if absent, installs locked dependencies, migrates, and only seeds fictional accounts when `-Demo` is supplied. It never overwrites an existing `.env`.

## Local startup: Linux / macOS

```bash
cp .env.example .env
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

For SQLite, export `DB_ENGINE=sqlite` and `DEBUG=True` in the backend terminal before migrations and startup. PostgreSQL behavior must still be tested before deployment.

## Addresses

| Application | URL |
|---|---|
| Frontend and proxied API | http://127.0.0.1:5173 |
| Backend health | http://127.0.0.1:8000/health/ |
| OpenAPI / Swagger (signed-in users) | http://127.0.0.1:5173/api/docs/ |
| Django platform admin | http://127.0.0.1:8000/admin/ |

Use a consistent host (`127.0.0.1` or `localhost`) so cookies stay on the same origin. Select an institute in the sidebar after signing in as Super Admin.

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

```powershell
cd backend
..\.venv\Scripts\python.exe -m ml.train --demo
```

This compares Logistic Regression, Random Forest, and HistGradientBoosting using disjoint student groups. It writes a trusted local artifact, versioned metadata, evaluation metrics, and a confusion-matrix chart in `backend/ml/artifacts/`. Teachers can generate estimates from Learning insights after sufficient released academic observations exist.

**DEMO — SYNTHETIC DATA — NOT VALIDATED FOR REAL STUDENT USE.** The LMS runs without a model. See [ML methodology](docs/ml-methodology.md).

## Verification

```powershell
$env:DEBUG='True'
$env:SECRET_KEY='local-test-only-secret'
$env:DB_ENGINE='sqlite'
.\.venv\Scripts\python.exe backend\manage.py check
.\.venv\Scripts\python.exe backend\manage.py makemigrations --check --dry-run
cd backend
..\.venv\Scripts\python.exe -m pytest
cd ..\frontend
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

The current Playwright launcher uses Python and its own `e2e.sqlite3` database and ports 8001/5174. It flushes **only that explicit test database**. Other platforms can supply equivalent isolated servers; see [testing](docs/testing.md). A GitHub Actions configuration runs backend tests against PostgreSQL, but it has not been executed in this workspace.

## Implementation

- Five roles, session cookies, CSRF, password reset/change, institute selection, and scoped membership management.
- Academic hierarchy, years, terms, programs, sections, course definitions, offerings, teacher assignments, and enrollments.
- Published lessons, completion, private learning files, assignment supporting resources, private submissions, feedback and grade release.
- Timed quizzes, question banks, attempt limits, MCQ/boolean grading, and manual short-answer grading.
- Bulk attendance, provisional weighted grades, CSV report export, timetable conflict checks.
- Announcements, quiz/assessment release notifications, idempotent deadline reminders, staff grade history, scoped progress trends, department summaries and instructor workload.
- CSV invitations with validation and downloadable error details; experimental ML training/inference.

See [documentation index](docs/index.md) and [deployment instructions](docs/deployment.md). PostgreSQL and production Docker images with disposable TLS were verified locally. Actual SMTP and public deployment remain unverified.


## Latest continuation

Institute settings now control singular/plural academic terminology, grade bands/points, repeated quiz attempts and missing-category treatment. Gradebook and saved prediction history are paginated; gradebook filters also apply to streaming CSV exports. Super Admin can open `/platform` at any time and inspect an institute's administrators. School/college/university academic tests cover duplicate prevention and term-aware scheduling. See IMPLEMENTATION_PROGRESS.md for verified checks and remaining work; PostgreSQL/Docker verification now passes; external operational checks remain separate.


## Latest continuation verification

PostgreSQL 17: 73 tests passed (including four concurrency tests). SQLite: 69 passed, four PostgreSQL-only skipped. Frontend: 19 component tests and 17 Chromium workflows passed; production build/typecheck passed. Production PostgreSQL/Gunicorn/Nginx images built and isolated TLS/readiness/access-control/rate-limit smoke passed. Database backup/restore and a 2,000-student reporting benchmark passed. See [testing](docs/testing.md) and [limitations](docs/limitations.md) for exact scope.

Run `python scripts/verify-containers.py` with Docker Compose/OpenSSL for the isolated production smoke. It preserves production configuration and removes its disposable containers/volumes. The current application still has the documented remaining requirements; these results are not a production security or ML validation claim.

Latest additions include paginated attendance with recorded statuses and retry-safe page edits, contextual student attendance history, typed auth/report contracts, bounded filter/institute selectors, SQL department counts and a fix for rapid combined URL-filter changes.
