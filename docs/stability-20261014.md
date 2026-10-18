# Stability verification — 14 October 2026

## Scope and preservation

This work follows the comprehensive testing, bug fixing and stability request. It does not claim completion of the larger final-unified redesign. Existing UI, academic workflows, database records and concurrent developer edits are preserved. The user explicitly approved the targeted `RelationSelect.tsx` dialog fix and clarified that all Heads may review independent corrections in their own department.

No model/migration changes, application-data resets or recovery-backup recreation were performed. The existing PostgreSQL Docker container was restarted when Docker Desktop was unavailable. PostgreSQL tests use Django's separate test database; browser tests use a new guarded SQLite file per invocation. Previous browser fixture files are retained.

## Verified defects and repairs

| Defect | Targeted repair | Regression coverage |
|---|---|---|
| A duplicate `get_fields` override made the intended read-only finalized flag ineffective. | Merge the field handling while preserving quiz attempt metadata; ordinary serializers cannot set finalization. | Ordinary create/update requests, audited finalization/correction workflow. |
| Oversight permissions allowed ordinary manual marks and quiz release without teaching authorization. | Require assigned instructors, with both teaching capability and assignment for Heads; preserve oversight and audited correction routes. | Admin/non-teaching Head denials, initial and subsequent quiz release, revoked Head teaching capability. |
| Modal dropdowns portaled to the page lost pointer/focus access under the dialog. | Mount within the owning dialog, position within its visible bounds, and dismiss the picker before the form on Escape. | Desktop/mobile mouse, search, keyboard, focus return, viewport bounds; paginated selector and appointment workflows. |
| Platform account linking omitted the explicit target institute required by the API. | Include the selected institute in the existing request. | Positive and missing-institute component cases; real browser link and created membership verification. |
| Enrollment history offered generic write forms rejected by the audited enrollment API. | Keep history read-only and link Admin/Head users to the existing course enrollment dialog. | Course creation → reasoned enrollment → lesson → submission → released feedback. |
| Browser launcher flushed an existing fixture database. | Allocate a fresh guarded run directory; refuse existing files and application paths. | Three launcher refusal/preservation tests plus all browser workflows. |

The user-confirmed Head review policy preserves the concurrent implementation. Tests verify own-department approval without a delegation flag, cross-department/cross-institute denial, self-review denial and appropriate notifications. The legacy database flag is retained for compatibility but is no longer the review authorization gate.

Configured grading tests verify category weights, normalization versus zero treatment, custom grade bands/points, unreleased exclusions and separation of attendance/completion from assessment marks. No grading policy was invented or changed.

## Test evidence

The current stability acceptance criteria passed against the tested source. This does not establish completion of the larger final-unified upgrade or certify future concurrent edits.

| Check | Latest completed evidence |
|---|---|
| Frontend TypeScript | Passed after the enrollment integration repair. |
| Vitest | 45 passed, 19.06 seconds. A preceding loaded-machine run had 44 passes/one 5-second timeout; unchanged rerun passed. |
| Frontend production build | Passed; existing main chunk >500 kB warning remains. |
| Django system check with PostgreSQL | Passed, zero issues. |
| Migration drift | No changes detected. |
| OpenAPI validation | Passed with `--validate --fail-on-warn`. |
| Focused browser completion | Seven passed/one obsolete transfer-label failure; updated transfer case passed separately (54.2 seconds including setup). |
| Full Chromium suite | **35 passed together, 5.5 minutes**, including Head review without delegation. |
| Full PostgreSQL suite | **136 passed, zero failures/skips, 604.84 seconds**. Includes nine PostgreSQL concurrency tests. |
| Local application | Backend health at 8000 and SPA login at 5173 returned HTTP 200 after starting the local development servers. |

Run logs are ignored local artifacts under `backend/stability-*.log` and `frontend/stability-*.log`; final PostgreSQL JUnit output is `backend/test-results/stability-postgres-complete.xml`. Browser screenshots/traces are under `frontend/test-results/`. Focused test counts overlap full-suite counts and must not be added together.

Browser tests were updated to current accessible labels, action menus, collapsed enrollment suggestions and committed institute selection. Assertions still verify server responses, role boundaries, retained history and result values. Earlier diagnostic failures and interrupted runs are not reported as passes.

## File ownership

Application repairs are limited to learning serializers/views, the instructor predicate and review error text in governance, approved RelationSelect positioning, shared dialog Escape handling, LinkAccount's request, enrollment routing/configuration and removal of the obsolete delegation checkbox. Regression tests and test-launcher isolation were updated alongside documentation.

The broader dirty diffs in governance/roster, ReportControls, Gradebook, AcademicControl, AttendanceRoster and WorkflowDialog include concurrent developer work and must not be attributed wholly to this stability pass. They were preserved. No broad formatting or blanket staging/reset was performed.

## Remaining boundaries

- No unresolved critical authorization defect was found in the tested scope. Subsequent concurrent source edits require their own relevant regression checks; this is not an exhaustive security audit.
- Larger final-unified upgrade work remains: full teaching-Head workspace separation, institute-wide academic policy, complete requested reporting filters/drilldowns, final role-specific design acceptance and the complete fresh-institute journey.
- Production SMTP/inbox delivery, public domain TLS, off-host media restore, hosted CI, exhaustive accessibility, cross-browser coverage and sustained load are not established by this run. Historical local Docker production smoke was not repeated unnecessarily.
- Experimental ML uses synthetic demonstration data and is not validated for real student decisions.
