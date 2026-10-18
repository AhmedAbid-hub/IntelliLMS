# Implementation progress

## Invitation delivery correction — 18 October 2026

- [x] Traced creation/admission/import, commit callbacks, resend, token acceptance and UI status. Found a console/SQLite versus SMTP/PostgreSQL process/configuration split; the reported recipient exists in preserved SQLite but not the PostgreSQL database selected by a fresh root-configured process. No credentials or existing account records changed.
- [x] Fixed false transport success, pre-commit/cached resend responses and generic UI success. Reserve invitations in the original transaction; send after outer commit; recheck account/version; protect completed accounts and coalesce duplicate queued sends. Distinguish SMTP acceptance, local capture, failures and legacy unknown transport without rewriting history. Console/dummy mail cannot print setup links.
- [x] Added safe read-only mail/account diagnostics, 17 backend regression cases and seven invitation UI tests; updated existing policy/browser expectations. Preserved current invitation expiry, tenant/role checks, CSRF and reset flow.
- [x] Focused PostgreSQL checkpoint: 30 tests passed. Frontend: 66 tests passed with two workers; typecheck and production build passed. Initial checks identified pre-existing dashboard type errors, a stale navigation assertion and a stale browser admission helper; corrected without redesign. A resource-constrained parallel Vitest attempt timed out; the bounded rerun passed.
- [x] Final Django system check, migration drift and OpenAPI validation passed; the documented invitation schema matches generated output. Choice-only accounts.0009 produces no PostgreSQL schema/data SQL; not applied to existing application databases. Git whitespace checks passed and configured-secret scanning found no matches in the new implementation/tests/report.
- [x] Full PostgreSQL regression: **206 passed, zero failures/errors/skips (156.19s)** in a fresh isolated `test_invitation_*` database, with a fast hasher set only in that test process. Application PBKDF2 settings are unchanged. The earlier normal-hasher full attempt reached 34% without reported failures and was interrupted for runtime; it is not a completed pass. The 30-test focused checkpoint and browser workflows used normal hashing.
- [x] Chromium invitation/regression rerun: **4 passed (3.5m)**, covering guided admission, private setup links, retries/failure, expiry/replacement/replay, password reset/login, deactivation, CSV validation and grade release. Earlier two browser failures came from the outdated admission helper and passed after correction. Separate ports 6174/8101 and a new guarded test database preserve live processes/data. Final frontend: **66 passed (44.99s)**; typecheck/build passed (existing bundle-size advisory remains).

Evidence: `backend/invitation-regression-final.log`, `backend/test-results/invitation-regression-final.xml`, `frontend/invitation-vitest.log`, `frontend/invitation-browser.log`, and `backend/test-results/invitation-openapi.yaml`. No existing accounts/academic records, `.env` credentials, or model artifacts were modified by this task. Unrelated concurrent shared-component changes were preserved. The interrupted isolated test database was retained; neither application database was reset.

Details, modified-file map and exact manual verification steps: [invitation delivery investigation](docs/invitation-delivery-20261018.md). Real SMTP sending requires user confirmation and has not been performed. Existing recipient data must be reconciled with the intended PostgreSQL dataset before verifying that recipient there; neither database was reset or merged.

## Completed developer handbook — 16 October 2026

- [x] Created the ten requested handbook/index files, starting at [docs/README.md](docs/README.md), with a master architecture map, complete frontend/backend/model directories, role rules, ML map, 38 feature-to-file entries, 16 end-to-end workflows and testing/debugging instructions. Existing documentation and setup instructions remain intact; root README and docs/index.md link the new index.
- [x] Mapped 24 React router patterns, 30 configured resource pages and 52 expanded concrete page patterns, including all five dashboard variants and school/college/university distinctions. Every frontend source/test/style file has a verified handbook link.
- [x] Cross-checked all 148 documented backend URL patterns (144 under /api/v1/, including discovery root) and documented methods against Django registration/resolution: no missing/extra paths or method mismatches. Registry inspection was guarded against SQL; zero SQL calls occurred.
- [x] Mapped all 41 concrete domain models and 28 migration files; indexed all 50 backend test modules and 22 browser spec files. OULAD training/inference/artifact/history paths and their actual limitations are documented without retraining.
- [x] Checked 1,583 Markdown links across the ten handbook files, resolving 301 unique local targets with no missing files/anchors. No absolute Windows paths or private configured secret values were included. Source integrity comparison: all 315 tracked/non-ignored non-Markdown files match their starting SHA256 hashes; no application code, configuration, migrations or tracked artifacts changed. No database writes, migrations, seeding, test resets or model training were performed.
- [x] Recorded source-inspection findings without changing behavior: appointment scope may dereference a missing institute before denying a platform request; college batch UI/API restrictions differ; institute creation does not itself create an audit row; ordinary learning APIs retain an assigned teaching-enabled Head case in management workspace whereas ML generation requires teaching workspace. These are documented in [the permission map](docs/ROLES_AND_PERMISSIONS_MAP.md#discrepancies-and-boundaries), with static findings distinguished from runtime reproduction.

This milestone is documentation-only. Application test suites were not rerun; the preceding verified 189 PostgreSQL / 59 frontend / 50 Chromium checkpoint remains historical executed evidence. The handbook is ready for navigation and FYP viva preparation; the identified code findings require a separate authorized implementation task.

## Completed real-data ML integration — 16 October 2026

Authority: [REAL_DATA_ML_REQUEST.md](docs/REAL_DATA_ML_REQUEST.md). Earlier synthetic-only ML descriptions below are historical.

- [x] Audited existing training, inference, class batches, history, permissions and teacher UI. Reused the trusted local artifact infrastructure.
- [x] Downloaded publisher-pinned OULAD v1 archive, verified MD5/SHA256 and CC BY 4.0 attribution. 173,912 raw submission records; 50,815 eligible chronological sequences from 18,136 students, 3,098 below-40% outcomes. No attendance/click/quiz proxy substitution.
- [x] Compared prevalence baseline, logistic regression, random forest and histogram gradient boosting using disjoint student groups. Trained on two earlier TMA scores for the next submitted TMA score below 40%; absent scores/banked results/future-known snapshots excluded. Validation-only F1/threshold selection; held-out metrics saved in versioned metadata. Limited predictive performance is disclosed, not marketed as high accuracy.
- [x] Added explicit feature-schema dispatch, released-assignment extraction, upcoming unsubmitted assignment gate, immutable prediction provenance snapshots, missing-data handling and per-version warnings. Historical synthetic predictions remain unchanged. Fixed batch generation to enforce the same assigned-instructor permission as individual generation; Admin can inspect results only.
- [x] Applied additive insights.0003_prediction_context to recovered PostgreSQL. Unchanged live counts: 17 predictions, 217 submissions, 540 attendance rows, 108 enrollments. No database reset/reseed or backup replacement.
- [x] Integrated teacher source/target/metrics/context display and isolated fictional-account demonstration fixture.
- [x] Focused PostgreSQL: 21 passed (91.86s). Latest frontend: 59 passed (27.40s), typecheck/build passed. Django checks, no migration drift and OpenAPI validation passed. Added Head teaching-workspace/revocation coverage and read-only oversight controls.
- [x] Full Chromium regression: **50 passed (8.6m)**, including real-artifact teacher Analyze Class, individual prediction and history reload. Reviewed the final class-results and prediction-basis screenshots; source, target, recorded inputs, date and external evaluation limitations are readable in the existing dialog. The isolated demonstration preserves fictional recorded marks and never seeds the application database.
- [x] Full PostgreSQL regression: **189 passed (814.80s), no skips/failures**, including real public artifact loading/inference, feature preparation, schema validation, permissions, Head teaching capability revocation, retained history, batch deduplication, all academic workflows and PostgreSQL concurrency. Final documentation, SRS requirements, generated API schema and source/evaluation reports are synchronized.

Final evidence: `backend/real-data-postgresql-final.log`, `frontend/real-data-browser-final.log`, `frontend/real-data-*-final.log`, and reviewed screenshots in `backend/test-results/real-data-ml/`. The earlier full PostgreSQL run was interrupted at 38% and is not a pass; the first broad browser run was 48 passed / 2 test-expectation failures, both fixed before the clean 50-test run. Earlier Decimal conversion, React typing, test cleanup and selector failures were fixed before final verification. Docker/the existing database container and local processes were restarted on 16 October without recreating volumes or changing data. Final live readiness returned ready and the SPA returned HTTP 200; counts remain 17 predictions, 217 submissions, 540 attendance rows and 108 enrollments. No unrelated Git changes were reverted or staged.

The requested real-public-data training/integration/demo/documentation task is complete within its experimental scope. Active artifact: `oulad-a90f43b47bbf0041`, histogram gradient boosting, validation-selected threshold 0.20. Held-out test: accuracy 0.919933, precision 0.335320, recall 0.380068, F1 0.356295, ROC-AUC 0.821488, confusion matrix [[9116,446],[367,225]]. This limited performance is not evidence of reliable academic decisions; majority-negative accuracy is 0.941698 with zero recall/F1.

Remaining boundaries: source data lacks grade-release timestamps, so historical score availability is assumed; live inference requires released grades. A final descriptive audit found 37 late-submission windows whose cutoff is on/after the target deadline but before its submission, whereas live inference requires a future deadline. Documentation/comments now state the actual rule; model selection and metrics were not changed after test inspection. The target is neither non-submission nor course failure. Local cohort validation, prospective utility/fairness evaluation and local calibration require authorized real data; none is claimed. Hosted CI, real SMTP/TLS/off-host recovery and broader accessibility/load assurance remain separate operational work. No remaining implementation blocker is known for this request. On continuation, preserve this checkpoint and do not retrain just to improve held-out numbers or repeat completed modules.


## Active architecture request — 15 October 2026

Authority: [docs/ARCHITECTURE_REQUEST.md](docs/ARCHITECTURE_REQUEST.md), retaining nonconflicting earlier requirements. The explicit course-level Head correction delegation requirement supersedes the former automatic own-department approval rule. This is the current checkpoint; chronological sections below are historical. Existing staged work, live data and verified recovery backups are preserved.

- [x] Shared institution rules: schools use classes/sections/annual periods and direct Admin teacher assignment, with department/Head/batch APIs denied. Colleges default to two configurable annual study years; universities default to eight configurable semesters. New institute type is required; existing types and ambiguous historical records are never silently converted.
- [x] Adaptive navigation, dashboards, setup, admission and resource forms. School department controls are absent; custom terminology remains supported. Efficient structure counts use scoped database aggregates.
- [x] Additive migration `academics.0008_periods_and_progression`: explicit period type, placement stage/period/end reason and immutable progression decisions. Applied to recovered PostgreSQL without changing membership/enrollment/term/grade/attendance/audit counts. All three legacy periods retain their blank type; evidence: ignored `backend/test-results/architecture-migration.json`.
- [x] Admin-reviewed progression, repetition, correction, withdrawal, completion and graduation, with evidence preview, stale-review rejection, configured manual-review/all-required-pass policy, history and notifications. Former enrollment access ends while released results and captured decision evidence remain available to the learner.
- [x] Restore course-level delegated Head correction review and notifications. School correction review stays with Admin; ordinary teaching writes require actual assignment. Teaching Head workspace remains distinct from management.
- [x] Fix platform Admin invitations when no active institute is selected; use only the view-authorized target institute for related-record validation. Regression includes foreign-unit and duplicate denial plus fresh invitation activation.
- [x] Prevent overlapping retained enrollment during transfer/correction. Staff reassignment accepts active departmental appointments, rejects withdrawn appointments and retains closed-period teacher history; schools need no artificial department.
- [x] Complete approved ReportControls changes: academic year, class/program, section, subject/course, college study year, university batch/semester; shared report APIs apply actual recorded placement stage. Overview/workload integration and a teacher-search learner-count defect are fixed.
- [x] Explicit university GPA/CGPA configuration and real calculations from released scores/credits, with all/latest/best repeat policy, separate programs and visible exclusions. Disabled by default. These are provisional current-policy calculations, not immutable transcripts.
- [x] Fresh school, college and university acceptance journeys passed together with continuation/learning checks: **9 Chromium tests passed (3.5m)**. They create isolated institutes/accounts, activate invitations, assign teachers, admit/teach/assess/record attendance, progress students and verify released historical results.
- [x] Full PostgreSQL regression: **181 passed (915.43s), no failures/skips**, including progression, calendar/placement boundaries, privacy, permissions and concurrency. The subsequent platform administrator-count fix passed **6 focused PostgreSQL account/response-contract tests (29.65s)**. Earlier 175/16 checkpoints are superseded; overlapping runs are not added together.
- [x] Latest frontend **56 tests passed (19.49s)**, typecheck and build passed. Existing main-chunk advisory remains (~553 kB uncompressed). Django checks, no migration drift and warning-free OpenAPI validation passed after latest backend edits.
- [x] Full Chromium suite: **49 passed (8.5m)**. Subsequent GPA-form/mobile focus changes passed **9 targeted journeys (3.0m)**. Final platform UI/count browser case passed (56.9s); final seven desktop/mobile role/type cases passed again **7/7 (44.8s)**. Screenshots reviewed across all five roles and three Admin institute types; evidence retained under `backend/test-results/architecture-ui/`.
- [x] Fixed closed mobile navigation remaining keyboard-accessible: hidden state removes it from interaction, opening focuses Close, and Escape restores the toggle. Fixed missing platform administrator total using distinct active Admin accounts, with no ordinary-user directory exposure.
- [x] Reconciled current acceptance matrix, README, limitations, API/OpenAPI, permission/user guides, functional requirements, database notes and testing evidence. Live PostgreSQL-backed readiness and SPA login returned success after restarting only this session's local server processes.

Current commands/logs: `backend/architecture-postgresql-complete.log`, `frontend/architecture-browser-complete.log`, `frontend/architecture-vitest-final.log`, `frontend/architecture-typecheck-final.log`, `frontend/architecture-build-final.log`. Logs/evidence are local ignored artifacts; summarized outcomes belong here. One intermediate focused run had **12 database connection setup errors** because the existing Docker database container stopped; it was restarted without volume recreation, and the subsequent 16-test PostgreSQL run passed. Intermediate frontend failures were duplicate/renamed test labels; resolved in the 56-test run.

Protected-file authorization: the user explicitly approved targeted institution-aware changes to `ReportControls.tsx` on 15 October. `Gradebook.tsx` and `RelationSelect.tsx` were not edited by this architecture continuation; their earlier staged fixes are preserved. New migration and code files remain in the working tree; no blanket staging, commit, database reset or replacement backup occurred.

Remaining boundaries: current-policy results can change when policies/credits change, with this limitation disclosed; decision evidence remains captured. Progression/GPA review is bounded at 1,000 enrollments. Reports use actual placements and do not invent legacy study years. Real SMTP/public TLS/off-host media recovery, hosted CI, broader browser/formal accessibility/sustained load assurance, and real-data ML evaluation remain separate operational/assurance tasks. Synthetic ML is not validated for academic decisions.

Current outcome: all identified required functional gaps in the current architecture acceptance matrix are implemented and passed the recorded checks. The application is ready for local FYP review/use within the documented bounds. This does not certify every possible role/CRUD permutation, public deployment, sustained university-scale capacity or real-student ML validity.

Next work is external production acceptance (real SMTP/TLS/off-host recovery and approved privacy procedures), additional browser/accessibility/load assurance, and authorized real-data model evaluation. Optional immutable transcripts, richer file lifecycle and unattended jobs require separate scope. Do not restart, repeat completed modules, reset the database or replace verified backups on the next continuation.

Changed areas in this continuation: period/program/attendance validation, enrollment compatibility, progression-history privacy, workload aggregation, platform counts/contracts, institution-aware report/overview controls, mobile navigation focus, new negative/API/browser regressions and synchronized documentation. The broader in-progress architecture files from earlier continuations remain preserved.

## Historical completion checkpoint — 14 October 2026

The current authority is [docs/COMPLETION_REQUEST.md](docs/COMPLETION_REQUEST.md). Earlier stability-only and original-scope statements below are historical. The broader completion request remains in progress; no application data has been reset.

- [x] Reconciled AGENTS, requirements, existing code/migrations, dirty Git changes and prior test evidence. Verified the configured recovered PostgreSQL identity before work; preserved concurrent/protected component changes.
- [x] Added session-based Department Head management / personal teaching workspaces without changing stored roles. Teaching mode restricts course scope to personal assignments; inactive departmental appointments and revoked capability fail closed. Switching institute resets the mode. UI navigation and authoring controls follow the selected workspace.
- [x] Restricted ordinary lesson/material/module/assessment/attendance writes and quiz authoring to authorized instructors; management remains oversight/correction. Focused PostgreSQL workspace/authorization/governance run: **19 passed (61.22s)**. Head browser switch/revocation journey: **one passed (32.2s including setup)**.
- [x] Implemented optional protection for released grades and a 0–365 day attendance editing window in existing institute settings. Changes require an audited reason; old/new policy values are retained. Ordinary writes respect locks; independent corrections/emergency overrides preserve history. **Three isolated SQLite policy tests passed (10.61s)**; new PostgreSQL/full browser verification pending.
- [x] Implemented program/year/section/batch backend filters for gradebooks/exports, trends, predictions and workload; added SQL-aggregated, paginated course comparisons with enrollment, assignment coverage, attendance, released-assignment pass distribution and missing submissions. Frontend comparison tab uses existing selectors and course workspace links. **Three isolated SQLite reporting tests passed (10.86s)** including query-count and permission checks; PostgreSQL/UI verification pending.
- [ ] Complete current PostgreSQL regression, frontend typecheck/component/build and browser acceptance. Docker Desktop was stopped during continuation; restarted the existing installation and `newproject-db-1` container, preserving volumes. Initial policy PostgreSQL attempt was **three connection errors**, not a test pass. New full PostgreSQL run is underway.
- [ ] Finish the detailed completion acceptance matrix, remaining report drilldowns and scalable overview calculations, and any defects found by the current full suites. Weighted institution trends still iterate gradebook batches; the new course-comparison report uses SQL facts without loading learner records.
- [ ] Complete final responsive/role acceptance, fresh-institute lifecycle verification, and documentation reconciliation. Synthetic ML remains unvalidated on real student data. Real SMTP/public TLS/off-host restore remain separate deployment tasks.

Current new files: `docs/COMPLETION_REQUEST.md`, `backend/apps/learning/policies.py`, `backend/apps/insights/course_reports.py`, `backend/tests/test_teaching_workspace.py`, `backend/tests/test_academic_policies.py`, `backend/tests/test_course_comparisons.py`, `frontend/src/features/auth/HeadWorkspace.tsx`, `frontend/src/features/analytics/CourseComparisons.tsx`, `frontend/e2e/completion-head.spec.ts`. Existing auth/scope, policy/governance, learning permissions, reporting filters/routes and UI integrations were edited additively. No new schema migration was needed.

**Latest session status (11 October 2026):** original-scope assessment, invitation failure, department-head selection, module ordering and API-contract fixes implemented. Current local regression: **74 backend passed / four PostgreSQL-only skips; 25 frontend passed; typecheck/build, Django checks, migration drift and OpenAPI validation passed**. **All 20 Chromium workflows passed together (2.3 minutes).** See the final handoff below for the complete result and readiness decision. PostgreSQL/Docker/production smoke already passed in the preceding session and were not unnecessarily repeated. Earlier chronological notes below are historical, including resolved environment blockers.



The original specification is saved in docs/REQUEST.md. Status must reflect actual verification.



## Historical continuation audit and dependency checklist



Full requirement-by-requirement source audit: [docs/audit-current.md](docs/audit-current.md). It distinguishes tested, unverified, partial, missing and unintegrated features; earlier checked milestones are baseline evidence, not a claim that whole modules or production deployment are complete.



- [x] Read original requirements, existing guidance, source, tests and deployment configuration; preserve the working app.

- [x] Audit all five roles, modules A–L, ML, API/UI, security, seed, testing, deployment and documentation.

- [x] Identify integration gaps: terminology metadata, filter APIs, unbounded gradebook, repeated scopes, role dashboards and global overview.

- [x] Check PostgreSQL/Docker availability: neither installed; portable binary download attempts fail DNS on execution host.

- [x] Module 1: fix archive/publishing boundaries, notification audience and DOCX structure; add negative regression tests. Verified: 14 security tests passed, Django check passed. Attempt saving already had the archive guard; regression added.

- [x] Module 2: validated institute letter bands/grade points/repeat-quiz policy and real terminology across settings, forms, tables, navigation and academic pages. Verified: 15 focused backend tests, 12 frontend tests and production build passed.

- [x] Module 3: scoped server-side report filters/paging, bounded gradebook batches, streaming CSV and paginated ML history; integrate frontend. Verified: 13 reporting/workflow backend tests, 12 frontend tests and production build passed. CSV tested with 106 enrollments and <=100-row batches.

- [x] Module 4: five role dashboards with management statistics/actions, persistent platform overview and institute administrator/detail workflow. Implemented and API/browser-tested. Added persisted public platform configuration (name/support/login notice), Super Admin-only writes and global audit records; positive/negative API and browser tests passed.

- [x] Module 5: natural-key duplicate prevention and term-aware timetable checks; role/category workflow tests. Four focused tests passed across school/college/university; local migration applied; build and 12 frontend tests passed.

- [x] Module 6 implementation: database readiness API, shared Nginx auth limit, portable isolated E2E launcher, PostgreSQL-only concurrency test, verification script and container CI smoke job. Readiness and Windows E2E tested; YAML parsed. PostgreSQL/Nginx/Docker execution remains unverified and blocked.

- [x] Local final verification: 52 backend tests passed, 1 PostgreSQL-only concurrency test skipped (154.19s); 12 frontend tests passed; 11 Chromium workflows passed together plus the ML-selector workflow passed separately (12 distinct). Build/typecheck, Django check, migration drift and OpenAPI validation passed.

- [x] Rechecked local app: desktop/mobile preview has no JavaScript errors or page overflow; visually fixed clipped dashboard shortcuts. Updated API, user guide, database, deployment, testing, limitations and current audit; screenshots refreshed.



Do not mark PostgreSQL or Docker executed until an actual runtime becomes available. Do not claim real-world ML validation without lawful historical data and external evaluation.



- [x] Inspect workspace; create project guidance

- [x] Backend identity, institute scope, permissions, migrations and negative tests

- [x] Academic administration and memberships, invitations and atomic CSV import

- [x] Learning content and authorized private materials

- [x] Assignments, grading, feedback and release

- [x] Timed quizzes, question bank, automatic/manual grading and attempt enforcement

- [x] Attendance, weighted gradebook, manual assessments and weekly timetable

- [x] Announcements, notifications, scoped dashboards and CSV reports

- [x] React interface connected to session-authenticated APIs

- [x] Synthetic ML training, evaluation, trusted inference and explicit demo labels

- [x] Repeatable fictional demo data for three institute categories

- [x] Baseline verification: 24 backend, 10 frontend and 2 browser workflow tests passed

- [x] Batched gradebook, activity/attendance/score trends, department/workload and latest risk summaries; 3 additional backend tests passed

- [x] Verify assignment attachments, grade-history permissions, quiz release notifications and archived-course grading restrictions

- [x] Docker and deployment configurations written; not executed on this host

- [x] Documentation synchronized: setup, API, user guides, ERD, testing and honest requirement audit

- [x] Expanded backend suite: 30 passed; frontend suite: 10 passed; production build and schema checks passed

- [x] Super Admin account directory, status management, session revocation and existing-user linking implemented; authorization tests passed

- [x] Six distinct Chromium workflows verified, including Super Admin linking an existing account into a second institute

- [x] Final desktop/mobile local preview: no browser JavaScript errors or page-level horizontal overflow



## Continue here



The core local application is running at http://127.0.0.1:5173 with Django at port 8000. See README.md for restart commands and seeded credentials. All source and migrations are saved in this repository.



Next priorities: complete remaining auth/import/aggregate API schemas; bound remaining report-filter, institute and roster selectors; expand role/CRUD coverage and sustained production-scale load tests. PostgreSQL concurrency, production container smoke and a 2,000-student reporting benchmark now pass locally. Calendar/assessment guards, role routing, audit UI, workload pagination and generic form selectors are now implemented; see the latest continuation below. Real-data ML evaluation requires an authorized historical cohort. Additional gaps are listed precisely in docs/limitations.md. Do not treat the synthetic model as validated for student decisions.



See docs/requirements-audit.md and docs/limitations.md for per-requirement scope. Checked milestones describe working implementations, not exhaustive completion of the original specification. PostgreSQL/Docker production execution and real-cohort predictive validation remain unverified.





## Session outcome — 11 October 2026



Implemented and verified without replacing the working application:



- Archive/draft audience boundaries, instructor announcement notifications and structural DOCX checks.

- Institute terminology, letter bands/points, pass threshold, repeated-quiz and missing-category policies with real form/report integration.

- Report filters/pagination, streamed CSV, bounded dashboard previews, SQL daily score aggregates, paginated ML learner selector/history.

- Role dashboard shortcuts and management counts; platform overview, institute details and administrator listings; persisted public platform configuration with authorization and audit.

- People/account/academic status filters; program/section duplicate constraints; overlapping-term timetable checks and instructor reassignment validation.

- Database readiness, shared Nginx auth-limit configuration, isolated portable browser launcher, PostgreSQL verification/concurrency test and container/browser CI jobs.



Migrations `academics.0004` and `accounts.0003` applied successfully to local SQLite. No existing records were replaced. Working development servers remain at 5173/8000. All project files were already untracked in Git; no commit or remote publication was made.



Final evidence: **52 passed, 1 skipped** backend; **12 passed** frontend; **12 distinct Chromium workflows passed** (11 together, then one focused learning-insights paging test). Build/typecheck, Django system checks, migration drift and OpenAPI validation passed. Compose/workflow YAML parsing passed but is not container/runtime evidence. Browser launch and selector failures encountered during development were corrected; dense test logins use a guarded E2E-only throttle override, leaving normal security settings unchanged.



### Exact next-session priorities



- [ ] Remaining hosted operations: real SMTP, domain TLS renewal and media/off-host recovery. PostgreSQL concurrency, production container smoke, local TLS/edge limits and database restore passed in the latest continuation; the earlier missing-runtime blocker is resolved.

- [x] Add concurrent question-edit/start, submission, grading and schedule tests; guard calendar date changes against existing timetable conflicts. Local deterministic tests passed; PostgreSQL race execution still blocked.

- [ ] Remaining API schemas and exhaustive academic CRUD/role permutations. Role-denial routing, breadcrumbs/toasts and assessment action schemas are implemented and tested.

- [ ] Benchmark large PostgreSQL cohorts and query plans; bound remaining filter/institute/roster selectors. Workload and generic form/bank choice lists now paginate.

- [ ] Complete production privacy/file-lifecycle procedures and evaluate ML only with an authorized historical cohort; synthetic estimates are not real-world validation.



The original specification is **not declared complete**. See docs/audit-current.md for each requirement group and docs/limitations.md for exact boundaries. Infrastructure/runtime verification is distinct from successful local implementation tests.





## Current continuation — 11 October 2026



- [x] Calendar date changes revalidate existing overlapping room/instructor slots. Academic calendar/schedule writes lock the institute before validation. Case-insensitive room conflicts covered.

- [x] Assignment/quiz/question edits revalidate under row locks; submission updates lock existing work before checking resubmission/graded state. Six deterministic regression cases passed again with the new audit test (7 passed); earlier focused academic/workflow suite: 18 passed. Actual PostgreSQL races remain unverified.

- [x] Route access boundary prevents unauthorized page mounting; scoped workspace selection, breadcrumbs and dismissible success notifications integrated. 14 frontend tests passed.

- [x] Super Admin global platform audit API/page with search, record/action filters, pagination and read-only enforcement. API positive/negative tests passed; browser verification pending.

- [x] Instructor workload paginated (25/default, 100 maximum), searchable and status-filtered, with own-teacher/head/tenant boundaries. Trends preview capped at five. Six focused reporting tests passed. Fixed omitted archived filter incorrectly excluding archived courses from all-course reports.

- [x] Full regression, schema, migration drift and Chromium checks passed; see the final counts below.



At this earlier checkpoint PostgreSQL/Docker were unavailable. The later runtime evidence below supersedes that blocker.



- [x] Explicit request/response OpenAPI contracts for assignment submission, submission grading, quiz start/answers/submission/manual grading, attendance and question-bank copy. Runtime validators reject nontext feedback/answers, excess lengths, invalid booleans and nonfinite marks. Bank copying now revalidates under the quiz row lock. Eighteen focused assessment/workflow tests passed; schema validation and migration drift passed.

- [x] Added PostgreSQL-only concurrent question edit/start, first submissions, grading/resubmission and room-booking tests. Runtime evidence remains blocked; SQLite execution must skip these cases.

- [x] Full backend and Chromium regression passed against isolated test databases; final counts below.



### Verification before bounded-selector milestone



Full backend: **62 passed, 4 PostgreSQL-only skipped in 228.16 seconds**. Full Chromium: **15 passed in 2.0 minutes**. Frontend: **15 passed**, build/typecheck passed. No migration changes. OpenAPI validation passed without warnings.



- [x] Generic related-record forms now use server search and one page of choices at a time. Multiple selections and labels remain visible when paging/searching; selected foreign keys are preserved when editing. Component test verifies no automatic page crawling and selection retention.

- [x] Question-bank destination quiz picker uses the same bounded selector and emits save feedback.

- [x] Frontend component suite after selector integration: 16 passed; production build passed.

- [x] Final browser verification includes a real 51-record course selector: 16 Chromium passed. Final build and all 16 component tests passed after bank picker integration.


### Infrastructure environment changed during this continuation

Docker Desktop 4.94.0 / Engine 29.8.2 / Compose 5.5.1 is now installed and responding. Earlier missing-runtime blockers are superseded. A disposable PostgreSQL 17 container on loopback port 55432 is used for verification; existing SQLite data is untouched.

- [x] All migrations applied successfully to PostgreSQL.
- [x] PostgreSQL custom-format pg_dump/pg_restore rehearsal into a separate database restored the fixture and all 32 migration records. This verifies database restoration only, not media/off-host disaster recovery.
- [x] Full PostgreSQL suite: 66 passed in 214.94 seconds, including all four row-lock races; no skips. System checks and migration drift passed.
- [x] Production images built and TLS/Gunicorn/Nginx/edge-limit smoke passed via new scripts/verify-containers.py. The helper uses temporary environment/TLS files, a unique checked project name, isolated volumes and loopback ports 18080/18443, then removes only its own services/volumes. Production .env and the local demo are preserved.

Final frontend verification: **16 component tests passed; 16 Chromium workflows passed in 1.8 minutes; build/typecheck passed**. Desktop/mobile preview passed with no JavaScript errors or document overflow. Local servers were stopped between sessions and have been restarted at 8000/5173 without replacing their data.


## Earlier verified handoff — 11 October 2026 (superseded below)

**Implemented:** calendar rescheduling conflict protection; serialized academic writes; locked assessment revalidation/resubmissions/bank copies; explicit assessment action contracts and stricter validation; route denials, breadcrumbs and save feedback; Super Admin global audit page/API; scoped workload search/pagination; corrected archived-report filtering; bounded searchable form and bank selectors; isolated production verification and reproducible PostgreSQL reporting benchmark.

**Tests actually executed:**

- PostgreSQL 17: **66 passed**, no skips (214.94s), including concurrent question edit/start, simultaneous quiz starts, first submissions/grading/resubmission and competing room bookings.
- SQLite: **62 passed, 4 PostgreSQL-only skipped** (228.16s).
- Frontend: **16 component tests passed**, TypeScript/production build passed.
- Chromium: **16 workflows passed** together (1.8m), including 51-record selection, multi-role workflows, audit, route denial and workload search.
- Django checks, migration-drift and OpenAPI validation passed. All migrations applied on PostgreSQL.
- Production Docker build and smoke passed under DEBUG=False: healthy PostgreSQL/Gunicorn/Nginx, 163 collected static files, Nginx syntax, TLS SPA/readiness 200, anonymous grades 403 and edge limit 429. Temporary TLS is self-signed; no real deployment or email was sent.
- Database pg_dump/pg_restore rehearsal restored the fixture and 32 migration records into another disposable database.
- 2,000-student/four-course PostgreSQL benchmark passed: gradebook 25/100-row pages both used 14 SQL queries; workload 6 queries; trends 189; CSV streamed all 2,000 rows using 185 queries. Timings and conditions are in docs/reporting-benchmark.json. This is one development-host sample, not sustained-load/SLA evidence.
- Desktop/mobile dashboard and selector previews: no JavaScript errors or page overflow; screenshots reviewed.

**Still remaining:** precise auth/import/aggregate schemas, remaining filter/institute/roster selector bounds, sustained/concurrent larger-cohort performance and query-plan analysis, broader CRUD/role/accessibility/browser coverage, real SMTP/domain certificate renewal and off-host/media disaster recovery, institution-approved retention/file lifecycle procedures, and lawful historical-data ML evaluation. Synthetic predictions remain experimental. Optional enhancements are distinguished in docs/limitations.md.

The earlier missing Docker/PostgreSQL blocker is resolved. Docker Desktop was installed during this continuation; actual runtime evidence above supersedes earlier unverified notes. Local app remains on 5173/8000 using its existing SQLite data. Disposable verification containers/volumes are cleaned after checks; built images remain cached. No production database, .env.production, or unrelated working files were replaced. No Git commit was made because the repository already contains an entirely untracked project.

The whole master specification is still **not declared complete**; continue from the remaining items above.


## Continued implementation — API contracts and bounded filters

- [x] Authentication, password operations, profile updates, invitations and account attachment now validate typed request data before string/password operations. Malformed JSON returns field errors instead of server errors; invitations do not silently truncate names. Focused authentication/security checks: 17 passed.
- [x] Prediction generation validates UUIDs; history now applies the archived-course filter consistently. Focused prediction/report checks: 4 passed.
- [x] Report unit/term filters, resource filters and the Super Admin institute switcher now fetch one searchable page at a time. Filter selection survives page changes; tests verify shared bounded requests and clearing filters. Frontend: 17 component tests, TypeScript and production build passed.
- [x] Department reporting computes distinct learner/course counts in SQL instead of retaining whole-cohort UUID sets. Groups use unit identity, so a named "Unassigned" unit cannot merge with courses having no unit. Seven focused reporting/workload/pagination regressions passed.
- [x] Explicit aggregate, dashboard, gradebook, prediction/model, CSV, completion, notification and grade-history response contracts added. Schema validation passed without warnings; final combined response-contract and full regression results will be recorded after execution.

The next attendance-roster milestone was completed below, followed by combined regression and documentation synchronization.


### Attendance roster milestone

- [x] Added authorized `attendance-sessions/{id}/roster/` with 50-row pages, server search and recorded-status annotation. Teacher/head/course/tenant denials, inactive enrollment exclusion and bounded SQL query count covered.
- [x] Attendance marking validates only the requested learner IDs; existing all-or-nothing transaction behavior and 500-record API limit preserved.
- [x] New attendance dialog saves one reviewed page, keeps recorded statuses, blocks search/navigation while edits are pending and retains failed edits for retry. Student history now shows course, meeting and session date.
- [x] Remaining account-link unit selector uses bounded choice paging and configured terminology. Only quiz question/review collections now use `allPages` in application source.
- [x] Focused attendance/workflow backend checks: 10 passed. Frontend: 18 tests, typecheck and production build passed. New teacher-save/student-history Chromium workflow: 1 passed; previous full browser suite: 16 passed. Full combined browser, PostgreSQL, SQLite and container checks are running and will be recorded below.
- [x] Aggregate/auth/action response contracts: 6 focused tests passed, schema validated without warnings.

No migrations required by these changes. Student grade/attendance visibility and scoped staff permissions remain enforced server-side.


### Regression follow-through

- [x] Full PostgreSQL 17 regression now **73 passed, no skips (391.23s)**. Django system checks and migration drift passed. Full SQLite regression **69 passed, four PostgreSQL-only skips (369.15s)**. Both ran on isolated test databases while other verification was active.
- [x] Updated production images built and the isolated PostgreSQL/Gunicorn/Nginx/TLS/readiness/access-denial/edge-throttle smoke passed again. Disposable production-smoke containers and volumes were removed by the helper.
- [x] Updated 2,000-student reporting benchmark passed with gradebook pages at 14 queries, workload 6, trends 190 and streaming CSV 185; current measurements/conditions are in docs/reporting-benchmark.json. The extra trends query replaces unbounded Python learner-ID sets with database distinct counts.
- [x] Fixed the rapid-filter URL navigation race found by the combined browser run: role/status edits now compose while router navigation commits. A same-turn addition/removal/external-navigation regression passed. All 17 Chromium workflows subsequently passed together in 2.1 minutes, including the unchanged failing assertion.


## Current handoff — verified continuation

Completed in the latest milestone: typed auth/invitation validation; precise report/model/action schemas; prediction archived filtering; bounded report/resource/institute/account-link choices; department counts in SQL with identity-based grouping; paginated searchable attendance rosters with atomic reviewed-page saves and edit retention; student attendance course/meeting/date context; and the rapid URL-filter race fix. Search controls outside forms now share visible input/focus styling after responsive review.

Verification: **73 PostgreSQL tests passed**, **69 SQLite tests passed with four PostgreSQL-only skips**, **19 frontend component tests passed**, **17 Chromium workflows passed together**. TypeScript/build, Django checks, migration drift and OpenAPI validation passed. Production image build and isolated TLS/readiness/anonymous-denial/edge-429 smoke passed again after the filter fix. Desktop/mobile dashboard and attendance previews had no JavaScript errors or document overflow. Final cosmetic input styling was separately typechecked, component-tested, built and previewed. New screenshots are in docs/images.

PostgreSQL backup/restore was verified earlier in this continuation. The updated 2,000-student benchmark passed; exact query counts, timings and concurrent-host conditions are recorded in docs/reporting-benchmark.json. Disposable PostgreSQL/production-smoke containers and volumes are cleaned; no unrelated data was replaced. Local application remains operational at 5173/8000.

### Additional assurance and external validation

- [x] Audit computed-label fields in dynamically generated CRUD schemas: declared read-only nullable labels, documented staff quiz metadata and aligned attempt list/detail contracts; schema and real-response regression passed in the latest continuation. Broader negative-role permutations remain additional test coverage, not a missing module.
- [ ] Exercise very large quiz/review payloads, sustained/concurrent report traffic and PostgreSQL query plans; no capacity/SLA claim is made from a single benchmark.
- [ ] Run the repository workflows on hosted Linux CI and broaden browser/accessibility checks beyond Chromium and responsive/keyboard-capable components.
- [ ] Verify real SMTP delivery, actual domain certificate issuance/renewal and media/off-host recovery with deployment-owned infrastructure and credentials.
- [ ] Apply institution-approved data retention/deletion and file lifecycle procedures. Automated purge, antivirus, RLS and finalized GPA remain separately identified enhancements, not fabricated core blockers.
- [ ] Evaluate ML using an authorized historical cohort when supplied. Synthetic training/inference is implemented and tested but remains experimental.

No PostgreSQL/Docker installation blocker remains. External production services, institutional policies and lawful historical training data were not provided. The original specification is not declared fully complete; continue with the concrete items above rather than repeating the completed modules.


### Original-scope defect follow-through — 11 October 2026

Assessment draft preservation, load-error rendering, released manual-feedback review, decimal marks and saved short-answer grades are implemented; **25 frontend tests and typecheck passed** at this milestone. Course tabs now support arrow/Home/End keyboard navigation (verification pending). Module position ordering and department-head selection of unused own-unit course/program/section definitions are corrected. SMTP failures no longer interrupt committed invitations/CSV batches or expose email existence via differing reset error statuses; password reset is the retry path. Backend regressions, schema label coverage and final browser verification are in progress; these later changes are not yet declared verified. No existing database was reset. Prior PostgreSQL/Docker evidence remains applicable and was not repeated.


## Latest verified handoff — original scope, 11 October 2026

### Completed and verified in this session

- [x] Quiz answers survive background refetches, failed saves and edits entered while a save is in flight. Save feedback distinguishes newer unsaved work; submission disables editing. Failed attempt loading now displays its error instead of an endless loading state. Drafts are local to each attempt and are not persisted across page reloads.
- [x] Students can review released manual-assessment marks and feedback. Manual mark forms accept decimal scores. Quiz grading opens with saved short-answer marks, including zero; blank inputs leave existing marks unchanged or ungraded questions pending.
- [x] Modules list in configured position order with deterministic ties. Scoped update and other-tenant/student denial tests passed.
- [x] Department heads can select unused course/program/section definitions within their unit for the first offering. Tests exercise successful first-offering creation and other-unit, other-tenant and student denials. Academic-definition mutation permissions were not expanded.
- [x] Invitation acceptance verifies email generation after commit, password strength, CSRF, one-use reset token, login and disabled sessions. SMTP/OS delivery failures preserve created accounts, do not interrupt later CSV invitations and do not expose account existence through different HTTP reset statuses. Failed delivery is logged without recipients/tokens or SMTP exception details. Forgot password retries delivery; no durable mail queue is claimed. SMTP timeout defaults to 10 seconds.
- [x] Membership update and its audit event are atomic.
- [x] Read-only computed relation labels, staff quiz metadata and attempt list/detail output have explicit API schemas. Real response/label contract checks and warning-free schema validation passed.
- [x] Course tabs support arrow/Home/End navigation, roving focus and labelled panels; verified in Chromium without a redesign.
- [x] Browser invitation/password setup/replay, invalid and valid CSV import/error download, and fractional manual grade release/student feedback are connected end-to-end. E2E email capture is local and isolated from configured operator SMTP.
- [x] Updated API, user, permission, deployment, audit, testing, limitations and progress documentation. Historical audit snapshots are explicitly marked.

### Commands and actual results

- Explicit SQLite isolated test database: `python manage.py check` passed; `python manage.py makemigrations --check --dry-run` reported no changes; `python manage.py spectacular --validate --fail-on-warn --file schema.yml` passed without warnings.
- Full `python -m pytest -ra`: **74 passed, 4 PostgreSQL-only skipped, 221.49 seconds**. The four skipped concurrency cases require PostgreSQL row locks and passed in the preceding PostgreSQL run. This session did not re-run PostgreSQL, Docker or production smoke, as requested.
- Focused backend milestones: 10 invitation/administration/order/scope tests passed; 3 response-contract tests passed. These overlap the full-suite total and must not be added to it.
- `npm run typecheck`, `npm test`, `npm run build`: passed; **25 frontend tests**. Six new tests cover quiz draft/error/in-flight save behavior, decimal manual scores, released feedback and saved short-answer grades.
- Full `npm run test:e2e`: **20 Chromium workflows passed together in 2.3 minutes**. The initial run had 17 passes and three new-test selector failures; selectors were corrected to existing accessible control names and all 20 then passed. No application assertions were removed.
- Existing local backend health at 8000 and SPA login at 5173 returned HTTP 200. No existing application database or user data was reset. Only the guarded, disposable E2E database is rebuilt by the existing test launcher.
- No model migration was needed. Existing untracked repository content was preserved; no blanket staging/commit or redesign was performed.

### Remaining scope and improvement-stage decision

**Required functional gaps found in this audit:** all concrete missing/broken integrations identified above are now implemented and verified. No known missing original core FYP workflow remains from this audit. This is evidence for the covered workflows, not exhaustive proof that every possible input, role combination or deployment behaves correctly.

**Additional verification:** hosted Linux CI, Firefox/WebKit, formal accessibility review, larger quiz usability, sustained/concurrent report load and further CRUD/permission permutations. Existing PostgreSQL migrations/concurrency, production containers, restore rehearsal and 2,000-student benchmark remain recorded earlier; do not repeatedly treat them as missing implementations.

**Production-owned acceptance:** actual SMTP/inbox delivery, domain certificate issuance/renewal, off-host/media restore and institution-approved privacy/retention operations. These require deployment infrastructure, credentials and policy decisions that are not supplied. Mail sends remain synchronous; retry uses password reset.

**ML limitation:** synthetic demonstration training/inference is implemented and tested. No authorized real historical cohort or independent real-world evaluation has been supplied; predictions remain experimental, not validated student decisions.

**Optional/deferred:** the separately requested role UI redesign and staff expansion, finalized GPA/transcripts, automated retention/outbox/antivirus, per-institute model registry and other enhancements are outside this continuation.

**Readiness:** the tested original FYP workflow baseline is ready for the separate improvement stage. Full production acceptance and real-world ML validation are not complete. Preserve this regression suite and the current data when starting the next prompt.


# Active upgrade — 11 October 2026

The new master request is saved in docs/UPGRADE_REQUEST.md and supersedes the earlier deferral of UI/staff improvements. Original-scope test totals above are historical. Verified backup: C:/Users/Luveabid/Documents/IntelliLMS-backups/pre-upgrade-verified-20261011-203645.zip (231 files, source/config/private files plus consistent SQLite backup). Initial archive attempt encountered a Windows open-handle cleanup error; the separately named verified archive is complete.

- [ ] Role navigation, platform-only default access, explicit audited support, role dashboards.
- [x] Staff lifecycle: impact review, reassignment, role changes, head replacement, safe removal and last-admin protection.
- [ ] Consistent actions and historical record preservation.
- [x] Student creation, program/section metadata, bounded multi-select bulk enrollment/withdrawal/reactivation and CSV preview.
- [x] Grouped academic structure and terminology presets/advanced settings.
- [x] Unified teacher course workspace.
- [x] Bulk quiz authoring/import/templates/preview/bank selection/duplication/order.
- [ ] Marks/attendance policy, finalization and audited approval/corrections.
- [ ] Class-first reporting, filters/roster/drilldown/export.
- [x] Authorized class inference, progress/partial failures/deduplication and model labeling.
- [ ] Student tasks and personal evidence-based guidance.
- [ ] Private validated profile images, profile fields and notification preferences.
- [ ] Green/white premium design tokens, accessible responsive dashboards/forms/tables.
- [ ] Role notifications with destinations and deduplication.
- [ ] Bounded performance and query checks.
- [ ] Fresh backend/frontend/browser/PostgreSQL/deployment-compatible verification.
- [ ] Updated workflow, permission, ML and setup documentation.

Initial upgrade defects (subsequently addressed below): shared Super Admin academic bypass/navigation, direct unaudited-consequence membership editing, no lifecycle/removal/head-replacement actions, single-row enrollment, and unrestricted cascading deletion of some academic records. Existing selector regression passed previously; actual selector rendering will be retested before attributing a current clipping defect.

## Upgrade continuation — 12 October 2026 (in progress)

- Staff lifecycle implementation resumed and inspected rather than replaced. The consequence dialog is integrated into membership rows, explains retained history/withdrawn enrollment, records reasons, supports head replacement and uses membership IDs for replacements. Reopening clears stale choices. Ordinary role edits are blocked; Institute Admin cannot appoint another admin; existing active head creation is rejected. Head teaching eligibility now survives reactivation when omitted from the request.
- Bulk enrollment is integrated into course rows: server search/pagination, 100-person selection across pages, atomic tenant/department validation, duplicate-safe enroll, withdrawal/reactivation, audit reasons. Fixed roster search accidentally filtering the parent course (404). Enrollment/offering deletion is blocked; cascading deletion of populated academic records is rejected.
- Verification milestone: focused staff/enrollment tests 5 passed before adding the additional head-reactivation regression; frontend 27 tests passed, including consequence review/reset and bulk-selection retention on API errors. Django system check passed. Full backend regression is running; do not treat historical totals as current.
- Bulk quiz authoring added: 100-question validated batches and UTF-8 CSV preview/template, authorized paginated bank multi-selection, stable question ordering, and unpublished/unreleased duplication without attempts. Server locks the quiz against concurrent attempts; attempted quizzes cannot change questions/order. Additive migration learning/0007 adds position and was applied to local SQLite successfully, preserving data. Focused API tests: 3 passed (scope, atomicity, previews, CSV validation, bank permissions, ordering, attempt lock, duplication). Frontend integration typechecks; interaction/browser verification follows.
- No new backup or application DB reset. Existing verified recovery archive is retained. Remaining master checklist above is still authoritative; quiz/staff/enrollment milestones do not imply the entire upgrade is finished.

## Upgrade milestone — staff, enrollment, authoring and structure

The new staff departure/head replacement/bulk enrollment Chromium workflow passed on rerun after correcting its exact label selector. The CSV question preview/save/order/duplicate browser workflow passed in both runs. First complete run: 21 passed, one selector timeout; focused rerun: 2 passed. Frontend suite: 30 passed; build/typecheck passed before the next CSV/workspace edits. No failed application assertion was removed.

Academic Structure now groups departments/programs, years/terms, classes/sections and catalog, with daily enrollment moved to Courses & Enrollments. University/college/school terminology presets and collapsed advanced customization are integrated and tested. The existing school customization browser test passed after following the new Advanced disclosure.

Next implemented work under verification: student/staff CSV preview/template with identifiers/sections, and course workspace tabs for overview, students, attendance, grades, performance and experimental insights. Course report filters are enforced server-side; course-specific views must not show institute-wide summaries. Full regression and PostgreSQL checks will be recorded at the final checkpoint.

## Upgrade role and workflow checkpoint — 12 October 2026

- Platform Super Admin now lands on platform oversight, has no ordinary teaching links, and is denied academic CRUD and individual report APIs even with a selected institute. Platform/institute aggregate details, administrator/account management, own profile/inbox and model operational status remain available. No implicit platform support bypass exists; an audited support-access workflow is not implemented.
- Department Heads retain department-scoped instructor assignment. Institute Admin teacher changes require an explicitly selected override and a non-empty reason; old/new teacher IDs and override status are audited. Lifecycle reassignment uses its own already-audited reason. Archived courses reject instructor changes. Negative backend tests and 14 targeted academic/staff regressions passed.
- Student/staff CSV templates and previews are integrated. Preview creates neither users nor mail; import revalidates the whole bounded batch, preserves atomicity and checks duplicate IDs and tenant/department sections. Nine import/administration regressions passed.
- The teacher course workspace now includes overview, creation shortcuts, students, attendance, grades, course performance and experimental insights, alongside existing lessons/materials/assignments/quizzes/modules. Trends and prediction summaries accept validated course filters; course workload/gradebook/export/history no longer accidentally show institute-wide data within those tabs. Eight reporting/quiz regressions passed.
- Latest full SQLite run before CSV/role/workspace additions: 84 passed, four PostgreSQL-only skips. Current targeted results are above. Frontend: 33 tests, typecheck and build passed before the final override-interaction test was added. A test-only unsupported TypeScript `exact` option was fixed and rechecked. Full browser/PostgreSQL checks for the final changes are running; do not substitute historical evidence for their results.

## Class analysis milestone — 12 October 2026

- Completed the staff/enrollment/quiz/workspace checkpoint: all **94 PostgreSQL tests passed (361.15s)**, **34 frontend tests**, and **23 Chromium workflows together (3.4m)**. Corrected a browser selector to target the sidebar's Platform Accounts link; no application assertion was removed. Existing application health and login return HTTP 200; the interrupted development servers were restarted without reseeding.
- Added persisted class analysis runs and learner results, one active run per course, ten learners per request, resume/pause, per-request permission checks, per-student failures/missing-data results, and unchanged-input/model prediction reuse. Predictions retain timestamps and model versions. Gradebook aggregates provide bounded actual-data computation. Browser results distinguish recorded indicators from experimental estimates. No student risk alerts or automatic academic decisions are generated.
- Additive insights/0002 migration applied to local SQLite. Three focused batch API tests passed; **35 frontend tests**, typecheck/build, migration drift and warning-free schema validation passed. **24 Chromium workflows passed together (3.2m)**, including real trusted-artifact class analysis. A stronger rerun-completion assertion was added afterward and is awaiting rerun. Full PostgreSQL regression for this milestone is still running.
- Analysis processing is browser-driven in bounded requests, not an unattended queue. Closing the page pauses after any in-flight request; selecting the same course and Analyze Class resumes its active run. Maximum 10,000 student candidates per course/run; results are server-paginated. A completed run can be repeated to retry failed students; unchanged successful estimates are reused. Class filters/drilldown and academic-support notifications remain separate unfinished requirements.
- Profile images and notification preferences are now in implementation; do not treat them as verified yet. accounts/0005 is additive and applied locally. Initial image test exposed an open-file replacement issue on Windows; image responses now close their small normalized file before returning. Verification follows.


## Profile and student-priority checkpoint — 12 October 2026

- Class analysis PostgreSQL regression: **98 tests passed, no skips, 364.14s**. This includes seven PostgreSQL locking cases; concurrent class starts share one run and concurrent advancement does not repeat processed learners. The class-analysis browser rerun assertion now waits for its new run to complete rather than accepting the previous status text.
- Profile pictures: upload/replace/remove, initials fallback, private self and authorized roster delivery, JPEG/PNG/WebP verification, 4 MB/4-million-pixel limits, 256px normalization, metadata stripping, safe generated paths and cleanup after successful replacement. No user-selected executable image bytes are served. Academic notification preference applies to future in-app updates and reminders, not security emails or historical inbox entries. Profile names/password flows remain available. Five profile/response-contract tests passed after correcting the Windows file-handle defect; frontend milestone 36 tests/typecheck/build passed.
- Student agenda: own active courses only, published unfinished assignments/quizzes, upcoming/missed counts and actionable links, late-submission versus teacher-contact guidance, bounded 20-task preview, no false pending tasks for already-submitted work. Dashboard next steps use released scores and actual lesson completion, with missing-data text and one-decimal percentages. Two API tests passed after fixing a test fixture's missing quiz-attempt deadline. Frontend **37 tests/typecheck/build passed**.
- Additive migrations saved: accounts/0004 (earlier interrupted lifecycle), learning/0007 (question order), insights/0002 (analysis runs/results/dedup), accounts/0005 (private picture/preference). All are applied to the existing explicitly selected local SQLite without a reset. Repository source is untracked from before this session; no blanket commit/stage operation was performed.
- Latest full PostgreSQL and Chromium runs covering profile and agenda changes are in progress. Their final results must be recorded before calling this checkpoint fully verified.


# Final unified master scope — 12 October 2026

Authoritative requirements: `docs/FINAL_UNIFIED_REQUEST.md` (verbatim latest attachment). This supersedes conflicting permissions and acceptance criteria in the earlier upgrade. Earlier checked items indicate the tested implementation at that milestone, not completion of every stronger criterion in the final unified request. The final unified upgrade remains **incomplete**.

## Verified hierarchy checkpoint

- Super Admin account search/detail/change/link and membership lifecycle now expose administrative accounts only. Ordinary teachers, students and Heads are inaccessible through platform account APIs. Institute Admin still provisions academic accounts.
- Teacher provisioning, department appointment and course assignment are distinct. Admin authorizes eligible departments; Head appoints eligible active teachers in their own department, then assigns them to offerings. End-appointment is blocked until active course duties are reassigned/unassigned. Deactivation ends appointments and revokes access. Existing assignments are retained by additive migration accounts/0007; accounts/0006 stores appointments and eligibility.
- Institute Admin creates offerings. Head updates teaching assignments only. Admin exceptional assignment override still requires an audited reason. Approval/governance for other teaching writes is unfinished.
- Full PostgreSQL regression: **104 passed in 366.30s**, before the curriculum/setup additions below. Focused hierarchy/API regression: **13 passed**. Frontend **38 passed**, typecheck and build passed at the hierarchy checkpoint.
- Full browser run: **25 passed, two selector failures** (new button wording / required-field label). Corrected selectors using actual accessible roles/names; both affected workflows **passed together (47.8s)**. Full teacher journey verifies provision, invitation activation, Head appointment, assignment, login/course access, blocked premature withdrawal, unassignment and denied former-teacher access. No application assertion was removed.
- Profile image browser evidence now covers selected-file preview, normalized private image, refresh and logout/login persistence, replacement/removal and preference update. Screenshot saved at docs/images/profile-picture-desktop.png. Formal visual acceptance remains separate.

## Requirement acceptance matrix (latest scope)

Statuses: Implemented = connected code exists; Tested = recorded automated evidence; Partial = more required work; Pending = no verification or implementation. Tests do not imply final UI acceptance.

| Requirement group | Backend | Frontend | Permission tests | Browser | UI/UX review | Regression |
|---|---|---|---|---|---|---|
| Admin-only platform accounts | Implemented | Implemented | Tested | Tested | Partial | 104 PG / focused browser |
| Provision → appoint → assign teachers | Implemented | Implemented | Tested | Tested | Partial | 104 PG / focused browser |
| Staff lifecycle/consequence review/history | Implemented | Implemented | Tested | Tested | Partial | Included above |
| Full five-role hierarchy, dual teaching Head, legitimate multiple roles | Partial | Partial | Partial | Partial | Pending | Partial |
| Catalog/program metadata, curriculum, batches | Implemented this milestone | Implemented this milestone | Focused tests running | Pending | Pending | Pending |
| Guided resumable institute setup | Implemented this milestone | Implemented this milestone | Focused tests running | Pending | Pending | Pending |
| Guided student admission/placement/transfers | Partial (CSV/enrollment exist) | Partial | Partial | Existing CSV/bulk tested | Pending | Partial |
| Invitations: 48h, resend, delivery status; resets: 30m; passwords: 12+ | Partial (legacy flow) | Partial | Legacy tested | Legacy tested | Partial | New defaults pending |
| Private profile pictures/personal preferences | Implemented | Implemented | Tested | Tested including persistence | Screenshot captured | 104 PG / browser |
| Unified course workspace | Implemented | Implemented | Tested | Tested | Premium revision pending | Tested checkpoint |
| Quiz batches/CSV/bank/order/duplication | Implemented | Implemented | Tested | Tested | Spacious editor/discoverability incomplete | Tested checkpoint |
| Marks and attendance finalization/corrections/approvals | Partial legacy CRUD | Partial | Legacy tested | Legacy tested | Pending | New governance pending |
| Class/department/institute reports and complete filters/drilldowns | Partial | Partial | Tested subset | Tested subset | Partial | Tested subset |
| Experimental class ML runs/resume/results | Implemented | Implemented | Tested | Tested | Partial | Tested checkpoint |
| Actual-data student priorities/recommendations | Implemented subset | Implemented subset | Tested | Tested | Premium layout pending | Tested checkpoint |
| Event notifications/destinations/deduplication | Partial | Partial | Partial | Partial | Pending | Partial |
| Premium five-role dashboards/navigation/consistent actions | Partial | Partial | Partial | Partial | Pending | Partial |
| Performance/accessibility/fresh full 70-step institute journey | Partial | Partial | Partial | Pending full journey | Pending full audit | Pending final scope |
| Final deployment images/migrations | Migrations additive | Build available | Existing security tests | Historical smoke | N/A | Fresh final image pending |

## Academic structure milestone (verification in progress)

Added program duration/annual-or-semester structure/status, optional subject credits/status, term lifecycle status, program-stage required/elective subject mapping, admission batch by program/year, and optional section-to-batch association. All existing records are preserved by academics/0005; local migration applied successfully. Relation changes remain protected; archive flags preserve history. Schools can create programs/subjects without departments or credits. Search, pagination and relevant filters use existing resources.

Guided setup derives progress from persisted institute records and links directly to existing management pages. It resumes automatically; each indicator establishes existence of configuration, not completeness of all programs or policy approval. School department/head/appointment steps are optional. Guided admission and safe placement transfers are still separate unfinished requirements.

Next dependency order: finish academic structure/setup browser and regression checks; implement guided admission/placement and distinct invitation/reset lifetimes plus resend/delivery status; then grading/attendance governance, reporting/notifications and premium role-specific UI. Preserve existing data and the verified recovery archive. Do not reset the application DB or claim synthetic ML real-data validation.


## Invitation and setup continuation checkpoint

- Academic setup browser suite: **28 Chromium workflows passed (3.7m)**. Full PostgreSQL academic run exposed three real regressions: omitted HTML-form checkbox values silently created inactive programs. Fixed serializer defaults (no test assertions weakened); **seven academic tests passed** afterward. Fresh PostgreSQL regression with this fix and invitation policy is running.
- Setup and teacher-appointment breadcrumbs now have explicit route labels. Browser assertion and fresh mobile screenshot confirm `Institute setup`, without the erroneous `Page not found`. Setup mobile layout has no horizontal overflow; visual review completed for that page, not the full redesign.
- Added accounts/0008 AccountInvitation, distinct signed 48-hour invitations, 30-minute resets, 12-character password validation, one-time acceptance, resend invalidation, after-commit transport status and an authorized invitation review/resend dialog. New accounts have unusable passwords until setup. Login rejects accounts with no active institute membership; other active institute memberships remain valid. Tokens/passwords are not logged. Mail status explicitly says submitted to backend, not confirmed inbox delivery.
- Invitation policy API cases: **three passed**; legacy invitation/reset/import/contracts: **nine passed**. Dedicated browser acceptance and setup rerun: **two passed (58.8s)**, covering controlled mail failure/retry, expired and invalidated invitations, activation, replay, forgot password, expired and reused resets, accepted-status UI, and login denial after deactivation. Fault injection runs only against the guarded disposable e2e.sqlite3 fixture. Production SMTP was not exercised.
- Frontend was **39 passing tests** before adding invitation retry interaction coverage. A TypeScript-only unsupported Testing Library `exact` option was found in that new test and removed; final typecheck/build/suite still being recorded.
- Latest resume attachment confirms the same final unified scope; no restart or recovery-backup recreation. Next major implementation: guided Add Student with validated academic placement, curriculum/term enrollment suggestions, review, atomic creation/enrollment/invitation and retained transfer history.


## Guided admission and correction milestone — 12 October 2026

- Full authentication/academic PostgreSQL regression after the HTML-checkbox fix: **110 passed (340.80s)**. Typecheck, production build and **40 frontend tests passed** after fixing the test-only TypeScript selector option. Warning-free OpenAPI generation passed before adding governance and was revalidated after resolving its enum-name collision.
- Guided **Add Student** now connects student identity, program/year/batch/section, searchable/paginated curriculum-stage/term suggestions, retained course selections, server preview, review and atomic creation/enrollment/invitation. Preview writes nothing. A request receipt makes retries return the same membership rather than duplicate users/enrollments/invitations. Global username/email conflicts never overwrite an account. Existing cross-institute account linking is not offered by this wizard.
- Added Student placement & history, explicit course withdrawals/enrollment on section/program transfer, reasons and old/new placement audit. Prior placements/enrollments remain stored; re-enrollment reuses the existing enrollment. Legacy section placement is preserved on first transfer. Ordinary membership section edits now direct users to the transfer workflow. academics/0006 is additive and applied locally.
- Admission/transfer: **two focused SQLite tests passed**, **ten related PostgreSQL tests passed (34.88s)**, and the complete focused Chromium journey **passed (36.1s)**: preview without account creation, enrollment review, invitation activation, correct course access, section transfer, old enrollment retained and former course access revoked. Desktop/mobile review screenshots captured. Full new-institute acceptance remains incomplete.
- Academic governance implementation added: explicit per-record finalization of manual grades, assignment grades, quiz attempts and attendance sessions; normal grading/attendance writes reject finalized records. Correction requests retain old/proposed values and reason; independent Institute Admin or expressly delegated department Head approves/rejects, with current-value/rule revalidation. Requester cannot approve their own request. Explicit Admin emergency override and reasoned reopening are audited. Academic reviews and per-record Academic control are integrated; attendance-session controls link to individual attendance records. Three focused governance API tests passed; browser/full regression running next.
- Governance scope still partial: no institute-wide automatic lock policy or bulk finalization, and legacy Admin/Head grading on unfinalized records remains. Strict teaching-Head workspace/write separation is unfinished. Correction/event notifications and complete oversight reports are not yet implemented. Do not mark the whole governance or redesign requirement complete.
- Additive academics/0007 and learning/0008 migrations applied locally. New concurrent admission-retry and correction-approval PostgreSQL cases added; results pending. Fresh full Chromium/PostgreSQL checkpoint follows. Preserve the existing verified backup and application data.


## Governance / notification checkpoint before recovery

- Full PostgreSQL governance checkpoint completed: **117 passed (502.94s)**, including concurrent admission retry and correction approval. This preceded the later notification integration and external UI edits.
- Full Chromium governance checkpoint: **30 passed / 1 failed**; the failure was an old reset-link assertion for an invitation. Corrected it to assert invitation expiry. Subsequent selected run: **10 passed / 1 profile-login timeout**; the entire latest UI is not browser-regression certified.
- Added preference-aware, tenant-scoped, deduplicated notifications with local destinations for appointments, assignment changes, enrollment, admission/transfer, submissions, released grades and corrections. Student transfer notifications omit internal reasons. Added notification privacy, changed-only enrollment and correction-recipient tests. learning/0009 is additive and applied.
- Admin can inspect placement history for inactive students; transfer remains disabled until reactivation. Quiz authoring uses a wider responsive dialog and supports draft duplication/reordering before save. Frontend milestone: **43 component tests**, typecheck/build passed before the subsequent recovery request. Later externally changed UI invalidated some old test selectors; see current checkpoint below.

## Database recovery and eligible-teacher fix — 12 October 2026

Latest user priority: recover the correct database and fix the empty Teacher Appointments selector. Detailed evidence, backups, changed files and preservation checks: `docs/database-recovery-20261012.md`.

- [x] Located original data in `backend/db.sqlite3`: 3 institutes, 47 users, 46 memberships, 10 offerings, 3 existing teacher appointments. Khair is active and eligible through `eligible_units`; Head department is correct.
- [x] Identified split configuration: running server inherited SQLite; fresh commands used the new empty Compose PostgreSQL database. Both older anonymous volumes are empty `intellilms_test` clusters, inspected only through backed-up copies.
- [x] Recovered into separate PostgreSQL database `intellilms_recovered_20261012`; verified **2,126 exported objects**, fields, identities and relationships against the final SQLite snapshot. Preserved original SQLite, original volumes, empty old PostgreSQL database and private media.
- [x] Backed up source/media/config, archived old volumes, saved a verified PostgreSQL dump and SHA-256 manifest outside the repository. Removed only task-created inspection copies and temporary in-container dump.
- [x] Switched local `.env` and server to recovered PostgreSQL at 127.0.0.1. Django check and migration drift check passed; live candidate API returns Khair and Amina.
- [x] Fixed actual dropdown cause: the creation card clipped the populated popover with `overflow:hidden`. Generic selector now also retains selected labels across pages and permits clearing optional selections.
- [x] Added negative/positive appointment regression coverage. **8 focused PostgreSQL tests passed**, including authorization, inactive accounts, appointment creation, notification privacy, admission/history preservation.
- [x] Dedicated Chromium appointment journey passed (41.3s test, 2.3m including setup), at desktop and mobile widths, including clickability, valid creation, and preservation of the existing appointment. Real Khair remains eligible and unappointed; tests use disposable fictional accounts.
- [x] Restored the missing Gradebook export without replacing the redesigned Dashboard; retained course-scoped queries/exports/links. Removed Auth/feedback circular imports. Updated stale selector/label/attendance test interactions; **43 frontend tests passed (29.71s)**.
- [x] Recovery follow-through: typecheck/build and the combined appointment/large-selector browser run passed (two workflows, 2.4 minutes; `frontend/appointment-selector-verified.log`). This is historical recovery evidence, not current full-browser certification.

The database/dropdown defect is resolved in the live application; the whole final unified upgrade is still incomplete. Resume the wider scope with strict teaching-Head/write ownership, institute academic policies, complete report filters/drilldowns, the fresh-institute acceptance journey and a fresh full browser regression of the current redesign. Do not replace these focused results with historical full-suite claims. Synthetic ML remains unvalidated on real student data.


## Stability checkpoint — 14 October 2026 (verified)

Current scope is the comprehensive testing/stability request, not redesign. Preserve concurrent UI/academic edits; only the explicitly approved modal RelationSelect fix changes that protected component.

- [x] Reproduced and fixed ordinary serializer writes to `finalized`, unauthorized Admin/non-teaching Head manual grades, and unauthorized quiz release. Finalization uses the audited governance route. Teaching Heads require both capability and assignment. Added negative/positive API regressions and configured-weight/released-only grade calculations (attendance/completion stay separate).
- [x] Approved modal selector fix mounts the dropdown within its owning dialog, retains positioning and pointer/focus access, and lets Escape dismiss the picker before the form. Desktop/mobile browser regressions passed in the final combined suite.
- [x] Browser launcher now allocates a fresh guarded test database for each run and refuses to overwrite an existing file; live PostgreSQL, original SQLite and historical test databases are preserved.
- [x] Baselines: frontend 43 tests/typecheck/build passed; PostgreSQL 118 passed/3 stale-test failures; explicit SQLite 109 passed/3 same failures/9 PostgreSQL-only skips. Initial unavailable-Docker run was not a database pass. Existing Docker database was started without recreation.
- [x] Focused authorization/grading/governance batch: 15 passed; malformed institute validation: one passed.
- [x] Full PostgreSQL rerun: **136 passed, no failures or skips (604.84s)**, including nine concurrency cases and new authorization/grading/database-preservation regressions. Earlier 132-pass/one stale notification failure and unavailable-Docker results are superseded by this completed run. Existing container restarted without recreation.
- [x] Enrollment history no longer offers direct CRUD calls rejected by the backend. Admin/Head users follow the existing course enrollment workflow, preserving reasons, notifications and history. Full course/enrollment/lesson/submission/released-feedback browser journey passed.
- [x] Platform account linking now sends the explicit selected institute; positive/no-institute component tests and real linking browser flow passed. Browser navigation waits for the committed institute selection.
- [x] Latest frontend: 45 component tests passed (19.06s), typecheck and production build passed. An earlier loaded-machine component run timed out once; the unchanged test passed on rerun. Existing >500 kB bundle warning remains.
- [x] Focused latest Chromium run: seven passed/one stale placement-transfer label failed. Updated to the current accessible labels; complete admission/activation/transfer/history/access-revocation test then passed (54.2s including setup).
- [x] PostgreSQL Django system checks, migration drift (no changes) and warning-free OpenAPI validation passed. No schema migration or live data reset was performed.
- [x] Final combined Chromium suite: **35 passed (5.5m)**, including own-department Head review without delegation, desktop/mobile modal dropdowns, invitations, course enrollment, staff lifecycle, quizzes, reports, ML batch controls and admission/transfer. Mobile dropdown screenshot visually checked; no full accessibility certification is implied.
- [x] Current stability acceptance is verified against the present source. Detailed fixes, ownership and evidence: [stability report](docs/stability-20261014.md). This is not completion of the broader final-unified upgrade.
- [x] Local development app restored on 8000/5173; backend health and SPA login returned HTTP 200. No application records were reset or re-seeded.

- Confirmed user clarification on 14 October: every Head may review independent corrections within their own department; per-course delegation is no longer required. Concurrent implementation preserved; tests now retain cross-department/cross-institute denial and self-review denial. A new same-institute cross-department case includes a teaching assignment to prove it grants no review permission.
- Modal dropdown tests passed at 1280px and 390px; paginated selector, CSV import and finalization/correction browser tests passed in the focused batch (5 passes/2 stale-label failures, corrected for rerun).
- Original browser diagnostic was 8 passed/24 failed; subsequent current suite was 27 passed/seven failed. These are superseded by the final combined 35-pass run. No intended workflow/security assertions were removed.

Remaining larger upgrade work: complete teaching-Head workspace separation, institute academic policies, all requested report filters/drilldowns, final role-specific UI acceptance and the complete fresh-institute journey. Separate external checks: production SMTP/inbox delivery, public TLS, off-host media restore and hosted CI. Broader cross-browser/accessibility/load assurance and the existing bundle-size warning remain. ML remains synthetic and unvalidated on real students. No unresolved critical defect was found in the tested stability scope; subsequent concurrent changes require relevant verification.
