# Developer guide

Read root AGENTS.md before changes. Domain ownership:

- `backend/apps/accounts`: identity, institutes, memberships, sessions, central scope, invitations.
- `backend/apps/academics`: hierarchy, academic calendar, offerings, enrollment, timetable.
- `backend/apps/learning`: lessons/files, assessment workflows, attendance and notifications.
- `backend/apps/insights`: scoped aggregates, audit records and prediction endpoints.
- `backend/ml`: reproducible offline training and trusted-artifact inference.
- `frontend/src/features`: authentication, resource forms, workflow dialogs, course pages, analytics and quizzes.

Add a domain model, migration, explicit serializer validation, scoped queryset and negative tests before exposing an endpoint. Dynamic resource serializers share tenant checks and are cached for stable OpenAPI identities. Do not make new sensitive fields writable merely by adding them to a model; review serializer field access.

Complex transitions belong in dedicated transactional actions. Student identity is derived from request.user. Never accept client marks, release flags, tenant IDs, or another learner's user ID in a submission operation. Questions lock after any attempt. Preserve atomicity across multi-row attendance/import operations.

The generic frontend resource configuration describes real model fields and option sources. Use specialized pages for workflows that cannot be represented safely by CRUD. Option lists traverse backend pagination. Main tables use 50-row pages. Frontend cache is invalidated after mutations; all tenant-sensitive queries must be reset on institute switching and logout.

Run `manage.py makemigrations`, `migrate`, `check`, backend tests, frontend tests and build. Regenerate OpenAPI using `manage.py spectacular --file openapi.yaml`. Add screenshots/browser checks for meaningful UI changes. Update progress and limitations honestly.

To add a historical model: validate lawful provenance and temporal feature snapshots offline, run the CLI, review grouped evaluation and applicability to the intended institute, then place the trusted artifact/metadata in the controlled model directory. No browser uploads of serialized Python models are supported.
