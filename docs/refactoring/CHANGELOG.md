# Refactoring changelog

## 20 October 2026

- Introduced `frontend/src/app` for startup composition, providers and routes.
- Added 30 named resource page entries, retaining all existing URLs and the generic unknown-resource fallback.
- Extracted navigation, sidebar/header, people actions, audit/platform presentation, resource row actions, course/account forms, placement fields, correction queue/decision presentation and role dashboard panels.
- Named actual course/platform implementations CourseWorkspace and PlatformDashboard; retained compatibility exports for old internal imports.
- Replaced four broad backend view files with feature-named packages; moved account serializers into their own package. Existing `apps.<domain>.views` imports still resolve.
- Preserved model definitions, migrations, API contracts, styles, academic rules and current role policies.
- Added a no-SQL documentation generator for physical table columns/types/constraints, ER diagrams and registered API handlers, with optional read-only PostgreSQL metadata verification.
- Updated the existing handbook and added beginner orientation, design, database explorer and feature guides.
- Updated stale browser assertions for current empty tables, department-first course navigation, selector request accounting and the existing Guided setup breadcrumb.

For executed checks, failures/reruns and the active checkpoint, read [PROGRESS.md](PROGRESS.md). No commit or push is implied by this changelog.

## 21 October 2026 verification repairs

- Restored UTF-8 punctuation in one appointment test and two extracted correction presentation modules after a Windows default-codepage read altered those literals.
- Stabilized the staff browser helper by centering its trigger instantly before opening a menu that dismisses on scroll; application menu behavior is unchanged.
- Bounded the appointment test mail lookup by scanning newest captures first and returning on a matching invitation. No real mail is sent.
- Corrected stale route counts, source names and startup descriptions in older handbook sections; added the existing Departments & Programs route and updated migration/test inventory counts.
- Documented the existing membership DELETE action in the published OpenAPI. Runtime API before/after remains identical.
- Completed full browser verification (49 passed / 2 timeouts) and a fresh unchanged three-case rerun (3 passed); retained failure traces and documented the single-run limitation.
- Finished the handbook's path/anchor/route checks and read-only PostgreSQL preservation verification. Restarted the existing Docker database and local application after the environment had stopped; health, readiness and frontend/proxy checks passed.
