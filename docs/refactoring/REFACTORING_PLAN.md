# Refactoring plan and boundaries

1. Preserve the starting commit/source archive on a dedicated branch. Capture screenshots, generated API and read-only database/schema fingerprints.
2. Extract source boundaries while preserving function bodies, JSX/style values, query ownership and public imports.
3. Keep models, migrations, settings, credentials, CSS, ML artifacts and data unchanged.
4. Expose named page entries and feature-named HTTP handlers; retain shared resource forms and existing services.
5. Update the existing handbook, add generated schema/endpoint references and a safe visual database guide.
6. Run PostgreSQL pytest, Django checks, frontend typecheck/Vitest/build, browser workflows, visual comparisons and contract/integrity checks.
7. Repair refactor regressions. Update stale tests only when source/UI evidence proves their expectation no longer reflects the starting application.
8. Record exact results and any remaining limitations. Do not push or expose private backups/test artifacts.

This plan does not authorize database repair, email transmission, model training, new permissions or functional redesign. Destructive or incompatible proposals are omitted rather than blocking independent source/documentation work.
