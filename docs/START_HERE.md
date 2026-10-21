# Start here: IntelliLMS for developers

IntelliLMS manages institutions, people, academic structures, course delivery, assessments and learning reports. One installation serves multiple institutes. A login identity can have a different membership in each institute; the active session determines which institute and role the API uses.

## Follow a feature through the application

1. Find the visible page in [FRONTEND_PAGE_MAP.md](FRONTEND_PAGE_MAP.md) or [WHERE_TO_EDIT.md](WHERE_TO_EDIT.md).
2. The React page calls [api.ts](../frontend/src/lib/api.ts), which uses session cookies and CSRF. Never store passwords or authentication tokens in browser storage.
3. [Django URL registration](../backend/config/urls.py) sends `/api/v1/` requests to a view. Find its actual handler in [API_ENDPOINT_MAP.md](API_ENDPOINT_MAP.md).
4. The view obtains [Scope](../backend/apps/accounts/scope.py), limits the queryset, validates input with a serializer, then calls a service or performs the operation in its existing transaction.
5. Django models describe PostgreSQL records. Read [DATABASE_DICTIONARY.md](DATABASE_DICTIONARY.md) and [DATABASE_RELATIONSHIPS.md](DATABASE_RELATIONSHIPS.md). The database browser does not apply API permissions.

For example, Course Offerings starts at [CourseOfferings.tsx](../frontend/src/pages/academics/CourseOfferings.tsx). It uses the shared ResourcePage and ResourceForm; those select the `offerings` configuration. Requests reach [OfferingViewSet](../backend/apps/academics/views/course_offerings.py), which validates academic structure and teacher assignments before saving Offering records. Bulk enrollment is a separate audited action in [enrollment.py](../backend/apps/academics/enrollment.py).

## Architecture

The backend uses Django 5.2 and Django REST Framework. Its four domain applications are accounts, academics, learning and insights. Existing models and migrations retain their names and history. Feature-named `views/` modules make HTTP handlers easier to locate; package exports preserve old Python import paths.

The frontend uses React, TypeScript, React Router, React Query, React Hook Form and the existing CSS. [App.tsx](../frontend/src/app/App.tsx) composes [providers](../frontend/src/app/providers/ApplicationProviders.tsx) and the [router](../frontend/src/app/router.tsx). The shell supplies navigation; feature components supply page content. Resource pages have named entry files while sharing validation, pagination, dialogs and rendering.

PostgreSQL is the normal application database. SQLite is used only by explicitly isolated evaluation/browser tests; the historical SQLite database is preserved. The ML artifact is an experimental OULAD model, not a validated local-student decision system.

## Roles and institution types

| Experience | Purpose |
|---|---|
| Super Admin | Platform overview, institutes, institute administrators, configuration and platform audits |
| Institute Admin | Institute structure, people, admissions, placement, oversight and authorized corrections |
| Department Head | Own department; a separate My Teaching workspace when teaching is authorized |
| Teacher | Assigned offerings, materials, assessments, attendance, grading and authorized analysis |
| Student | Enrolled courses, submissions, quiz attempts, released own grades and academic history |

Schools use classes/sections without departments or Heads. Colleges use annual progression; universities use semesters and configured GPA policies. Read [institution rules](SCHOOL_COLLEGE_UNIVERSITY_RULES.md) before editing shared forms. Hiding a navigation link does not authorize or protect an API; [backend permission rules](ROLES_AND_PERMISSIONS.md) are authoritative.

## Run this existing checkout

From the repository root in PowerShell:

```powershell
docker compose -f docker-compose.yml ps -a
# Start the existing stopped container without recreating its volume:
docker compose -f docker-compose.yml start db
.\scripts\start-backend.ps1
```

In another terminal:

```powershell
cd frontend
npm.cmd run dev
```

Use the address printed by Vite, which follows the root `.env` `FRONTEND_URL`. The checked workspace uses port 5174; do not assume every checkout uses the example port 5173. API traffic is proxied to port 8000. Startup rejects conflicting inherited database/email settings. Do not paste `.env` credentials into logs or documentation.

For a **new** installation, dependency installation and database initialization are in [README.md](../README.md). Do not rerun seeding or database initialization to troubleshoot an existing installation. Inspect the selected database and migration status first.

## Learn, edit and verify

- [Project structure](PROJECT_STRUCTURE.md): folders and current source files.
- [Backend feature map](BACKEND_FEATURE_MAP.md): page → API → validation/service → data.
- [Database explorer](DATABASE_EXPLORER_GUIDE.md): read-only DBeaver exploration.
- [Design system](DESIGN_SYSTEM.md): actual CSS variables and component styles.
- [Analytics and ML](ANALYTICS_AND_ML.md): model inputs, target and limitations.
- [Testing guide](TESTING_GUIDE.md): isolated regression commands and evidence.
- [Refactoring checkpoint](refactoring/PROGRESS.md): completed work, current tests and remaining tasks.

Read [AGENTS.md](../AGENTS.md), inspect Git changes, and keep changes small. Preserve tenant/role validation, transactions, history, response contracts and UI appearance. Run the relevant tests, including denied-access cases, before claiming a change works.
