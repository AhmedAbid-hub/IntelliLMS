# Current implementation audit

**Upgrade in progress:** the original-scope audit below is historical. The active requirements are `UPGRADE_REQUEST.md`; current implemented/verified milestones and unchecked upgrade work are tracked in `IMPLEMENTATION_PROGRESS.md`. Do not infer upgrade completion from original-scope T labels.

Audit started 10 October 2026 against the entire original `REQUEST.md`, actual source, 30 existing backend tests, 10 frontend tests and six previously verified Chromium workflows. This supersedes broad “Complete and tested” labels in the previous overview where only part of a module was exercised. Those tests are baseline evidence, not new execution in this session.

Status: **T** implemented, integrated and covered by a relevant test; **U** implemented/integrated but not fully verified; **P** partial; **M** missing; **I** exists but not integrated. Production readiness is a separate question from functional completeness. Optional suggestions in the master prompt (dark theme, additional feature candidates, alternative model names) are not mandatory acceptance criteria.

## Requirement-by-requirement findings

| Requirement group / original section | Status | Implementation, evidence and exact gap |
|---|---|---|
| 1–3 Actual monorepo, modular Django/React source | T | Four domain apps, migrations, typed SPA and build. Learning views and workflow dialog are large and should be split as modules grow. |
| 2 React/TypeScript/Vite/Tailwind/shadcn patterns/router/query/forms/icons | T | package lock, Radix-based UI components, component tests and build. No missing required framework. |
| 2 Django 5.2, DRF, sessions, ORM, psycopg, commands | T | requirements lock, auth and API tests. PostgreSQL 17 execution, migration and concurrency checks now pass; see latest evidence. |
| 2 ML pipelines, NumPy/Pandas/sklearn/Matplotlib/joblib | T | Real synthetic training, three models, saved evaluation, tested inference. |
| 4 Shared DB tenant ownership, UUIDs and memberships | T | Explicit institute ownership, scoped querysets and related-record checks; negative tenant tests. Direct ORM/SQL bypasses API checks. |
| 4 Search/filter/report/file/ML/bulk tenant boundaries | P | Implemented in shared scope; sampled tests pass. Not every list/action has independent isolation coverage. |
| 4 School/college/university/other and optional academic units | T | Flexible models and three-category seed; API academic workflows tested in school, college and university; school settings and college role dashboards verified in Chromium. Other category uses the same model but has no separate browser test. |
| 5 Login/logout/current user/session selection | T | Auth tests and browser cycles; cookie CSRF protection. |
| 5 Password change/reset/strength/disabled users | T | API tests include reset tokens and disabled existing sessions; actual SMTP remains U. |
| 5 Custom user and per-institute roles/status/unit | T | Initial migration and membership tests. Global role escalation fields read-only. |
| 5 Protected routes and permission-aware navigation | T | Dedicated route guards redirect before denied pages or APIs mount; role and institute boundaries are browser-tested. |
| 5/A Super Admin global counts, institute create/edit/status/admin assignment/audit | T | Persistent /platform overview, institute details and paginated administrator listings are integrated and browser-tested. Existing people/account linking remains operational. Public platform configuration now supports platform name, support email and login notice with Super Admin-only writes and global audit records; API and browser checks passed. |
| 5 Institute Admin dashboard/profile/people/academic management | T | Management shortcuts and teacher/enrollment totals surfaced. Gradebook filters and core academic workflows tested. People role/status/unit filters implemented; role/status browser test passed. |
| 5 Head department roster/courses/assignments/reports/announcements | T | Scope, workload and trends implemented for one assigned unit. Own-unit course/program/section reads now include definitions with no offering; first-offering positive and other-unit/tenant/student negative API cases passed. Exhaustive permutations remain additional assurance. |
| 5 Teacher dashboard/course/content/grading/attendance/ML | T | Core workflows retained, distinct grading/attendance/question-bank shortcuts added; browser-tested dashboard. ML remains experimental. |
| 5 Student enrolled content/work/results/history/progress/profile | T | Own results, completion, submissions, quizzes and progress implemented; negative ownership tests. |
| B Years/terms/units/faculties/departments | U | CRUD, hierarchy and date validation; complete CRUD matrix unverified. |
| B Programs/grades/classes/sections/subjects | T | Program/Section/Course plus configurable labels. API and database duplicate constraints added; school/college/university workflow tests passed. |
| B Course offerings/teaching assignments/enrollment | T | Browser and API evidence. Calendar edits revalidate schedules under institute locks; deterministic and PostgreSQL concurrency tests pass. |
| B Configurable terminology | T | Validated singular/plural labels now render in academic pages, forms, table headings and navigation. Component and school settings browser tests passed. |
| C User creation/invitation/profile/status/membership/role/unit | T | API tests; platform status and existing-account linking verified. |
| C Search, role/status/department filters, pagination | P | Backend scopes and paging retained; People role/status/unit, account status and academic status/term filter controls added. Form/filter/institute/account-link choices now use bounded server search and pages; selected identifiers survive page changes. |
| C CSV student/teacher import and downloadable errors | T | Atomic validation and UI error download. New complete CSV browser workflow is under verification; final results below. |
| D Courses/instructors/enrollment/sections/modules/lessons | T | Integrated CRUD and browser learning workflow. |
| D Reordering, publishing and visibility | T | Numeric order and date controls; module list ordering now honors position with deterministic ties and a scoped reorder regression. No drag-and-drop requirement. |
| D Archive offerings | T | Nested question deletion now checks offering archival. Archived attempt saving was already protected and now has a regression test. |
| E Text/PDF/documents/images/external video/download/completion | T | Private downloads and lesson workflows retained. DOCX structure, expanded size, path/encryption/macro/unsafe entry checks added and tested; no malware-scanner claim. |
| F Assignment title/instructions/marks/deadline/resources/late policy | T | API/forms/private attachment tests. |
| F Student text/file submission/timestamp/status/resubmission | T | Workflow and negative tests; retained submission time fixed previously. |
| F Grading/feedback/release/draft/published/late/graded states | T | Stored flags and grading action; some state names remain implicit in table fields. |
| G Quiz builder/types/marks/windows/time/attempt limits | T | API tests and timed browser flow. Concurrent question edit/start protection passed on PostgreSQL. |
| G Save/submit/auto-grade/manual-grade/result release | T | Server timing and hidden answers tested; archived attempt save guard confirmed by regression. |
| G Question bank reuse | T | Scoped authored questions and validated copy-to-quiz. |
| H Session/date/course and present/absent/late/excused marking | T | Transactional batch tests and percentages. |
| H Bulk updates/duplicates/audit/student history | T | Unique constraints, audited writes and a paginated searchable roster. Each reviewed page saves atomically; failed edits are retained. Whole-roster atomic submission is not offered. |
| H Course/department/institute attendance reports | T | Scoped filterable gradebook with pagination and streaming CSV; cross-tenant and own-student regression tests passed. |
| I Assignment/quiz/manual grades and feedback | T | Release and weight tests; grade history API/UI integrated. |
| I Configurable weights and weighted course score | T | Three categories sum to 100. Missing categories normalized, provisional only. |
| I Institute grading rules | T | Validated pass threshold, letter bands/points, per-quiz mean/best/latest attempt policy and missing-category policy. API, calculation, terminology and browser integration tests passed. |
| I Own/course gradebooks, academic summaries, history, CSV | T | Paginated/filterable provisional gradebook and streaming CSV tested with 106 enrollments; batches <=100. Finalized transcripts/GPA remain outside implemented provisional workflow. |
| J Weekly timetable/teacher/student/course/location/day/time | T | Overlapping-term, instructor-reassignment and term-date checks pass. API schedule mutations serialize per institute; actual PostgreSQL concurrent room-booking test passed. |
| K Institute/department/course announcement CRUD/audience | T | Unpublished messages restricted to authorized managers; negative audience regression tests passed. |
| K Inbox/read flags/new assignment/announcement/release/deadline events | T | Assigned instructors included in course notification recipients; audience/archive tests passed. Existing idempotent reminders retained. |
| L Counts/enrollments/attendance/completion/quiz/course/dept progress/activity/risk | T | Dashboard preview bounded to five, upcoming deadlines filtered before pagination, management counts exposed. Trends process enrollment batches and aggregate daily scores in SQL. A 2,000-student PostgreSQL benchmark passed; sustained/concurrent capacity and query-plan analysis remain open. |
| 7 Synthetic dataset and explicit experimental labeling | T | Reproducible seed, no real personal records; warnings in API/UI/evaluation. |
| 7 LR/RF/HistGB comparison, pipelines, imputation, scaling, imbalance | T | Actual evaluation and pipeline tests. Numeric features need no categorical encoding. |
| 7 Group split/leakage prevention/model selection/metrics/calibration | T | Grouped train/validation/test and Brier/confusion matrix. Historical data pipeline needs lawful cohort evaluation. |
| 7 Historical labeled CSV/minimum samples/time availability/version/evaluation | U | Authorized operator CLI, validation rules; no actual lawful data or real model validation supplied. No web training workflow. |
| 7 Trusted load/features/sufficiency/infer/persist/status | T | Missing/corrupt artifact and successful inference tests. Model store is shared across institutes. |
| 7 Teacher risk summary/distribution/details/time/version/context | T | Integrated API/UI; explicit uncertainty. Feature values are context, not causal or model-attribution explanations. |
| 7 Student attendance/assessment/completion/engagement trends | T | Own-only aggregate tests and responsive chart/table browser evidence. |
| 7 Transparency/bias/applicability/OULAD adaptation | U | Written guidance; no independent model review or real-data evidence. |
| 8 Relationships/types/constraints/indexes/status/timestamps | P | Program/section uniqueness migration added and applied on local SQLite. JSON quiz answers/options remain a documented normalization compromise; PostgreSQL migrations and regression now verified. |
| 9 DRF/versioning/methods/codes/errors/atomic transactions | T | Real resources, safe errors and transaction tests. |
| 9 Validation/scoping/search/filtering/ordering/pagination | P | Grades/predictions now paginated with validated filters; authorized scope cached per request. CSV streams. Workload and generic form choice collections now paginate. Filters, institute choices, account linking and attendance rosters now paginate. Department counts run in SQL; unusually large quizzes and sustained reporting load remain unverified. |
| 9 OpenAPI request/response contracts | P | Schema generated; assessment custom actions now have explicit validated request/response serializers. Auth/import/aggregate/prediction/model/action schemas are now explicit. Dynamic audit/configuration JSON remains extensible. Computed relation labels and staff quiz has_attempts are now explicit read-only fields; attempt list/detail uses AttemptResult. Schema generation and response/label contract tests pass. |
| 10 Cards/navigation/breadcrumbs/tabs/search/confirmation/forms/states | T | Integrated UI, component tests and previews. Breadcrumbs and dismissible save notifications are implemented and browser-tested; skeletons use basic loading state. |
| 10 Public login/reset/unauthorized/not-found pages | T | Existing routes/components; route denial now prevents restricted page/API mounting and is browser-tested. |
| 10 Super Admin detail/administrators/platform analytics pages | T | Persistent /platform and /institutes/:id pages, paginated administrators and entry to institute management; API authorization and browser verification passed. |
| 10 Institute/Head/Teacher/Student page sets | U | Each core workflow has a route or course tab. Role-filtered People views and explicit report filters are implemented; generic controls remain shared and exhaustive role/CRUD permutations need additional coverage. |
| 10 Typed client/context/query invalidation/forms/reuse | T | Real API integration; tenant change/logout clears caches. Not every specialized form uses RHF/Zod. |
| 11 Passwords/cookies/CSRF/tenant/IDOR/mass assignment | T | Relevant negative tests; not a formal security assessment. |
| 11 Input/file/query validation and safe errors | T | DOCX structure, report query validation, archive and draft boundaries added with regression tests. Not an exhaustive adversarial security audit. |
| 11 Secrets/environment separation/CORS/security headers | U | Same-origin approach; no CORS needed. DEBUG=False PostgreSQL/Gunicorn/Nginx runtime and TLS/headers passed the isolated production smoke; real-domain deployment remains external. |
| 11 Rate limiting and sensitive audit | P | Shared Nginx authentication limiter returned HTTP 429 in the production container smoke. Institute configuration updates now create atomic audit events listing changed fields. Not all sensitive reads audited. |
| 11 Privacy/retention/deletion approach | U | Written procedure; no automated purge or backup retention jobs. Do not equate documentation with runtime controls. |
| 12 All fictional demo entities and institute categories | T | Explicit DEBUG-only seed, repeat skip verified. Seed does not replace existing data. |
| 13 Required backend test categories | T | Existing suite covers each listed category; exhaustive permutations/concurrency missing. |
| 13 Required frontend/E2E categories | P | 12 component tests passed; new school configuration/pagination/platform/college-role browser checks passed. The existing learning selector was updated for configured terminology. All 11 browser workflows passed in one run; the additional ML-selector pagination test also passed (12 distinct browser cases). |
| 14 Local setup/env/commands and 15 development Compose | T | Local SQLite app, PostgreSQL migrations/tests and production Compose smoke verified. Hosted operations and external services remain separately unverified. |
| 15 Backend/frontend images/reverse proxy/static/private media | T | Docker images build and run with PostgreSQL/Gunicorn/Nginx, compiled SPA, collected static files and isolated private-media volume. TLS/readiness/access-denial/edge-throttle smoke passed. |
| 15 Health/env/migrations/backups/HTTPS/no Vite production | P | Database-ready endpoint success/failure tested; portable E2E and PostgreSQL verification scripts added. Production container smoke and PostgreSQL backup/restore rehearsal passed; media/off-host disaster recovery remains unverified. |
| 16 Overview/SRS/functional/nonfunctional/architecture/ERD/permissions | U | Documents exist; must synchronize each new module and this audit. |
| 16 API/setup/developer/five-role user/testing guides | U | Present, linked from docs/index.md; generic APIs require more precise contracts. |
| 16 ML methodology/evaluation/security/deployment/limits/future | U | Present and candid about synthetic metrics; production procedures unverified. |
| 17–22 Process, preservation, actual code, migration/tests, honest handoff | U | Working repository preserved; this session will implement and verify successive milestones. Full definition of done remains open. |

## Security and correctness follow-through

1. Read-only academic history must stay read-only after archival: block question deletion (fixed); verify the existing attempt-saving guard (tested).
2. Done and tested: restrict unpublished announcements and include assigned teachers in course notifications.
3. Done and tested: DOCX structure, decompressed size and unsafe archive entry validation.
4. Shared/edge rate limit configured; readiness API tested. Nginx/container runtime verification remains blocked.
5. Done and tested: scope before filter/pagination, validate queries and stream authorized report batches.

## Environmental findings

**Superseded by the latest continuation:** Docker Desktop became available; PostgreSQL 17 migrations, all 66 tests (four concurrency cases), database restore, and production container smoke now pass. The paragraph below records the earlier environment, not the current blocker.

`docker`, `psql` and `pg_ctl` are not on PATH and no `C:\Program Files\PostgreSQL` installation was found. The official PostgreSQL Windows page points to EDB portable binaries, but both Python and PowerShell downloads fail DNS lookup for EDB on this execution host. No PostgreSQL runtime test can currently be claimed. Browser-mediated web access works separately. This is an environmental blocker for executing PostgreSQL/Docker, not for writing tests and configurations.

## Scope discipline

No new requirement is silently substituted for the original. Dark mode is optional; random question selection, automated historical training UI, finalized transcripts, PostgreSQL RLS, antivirus and automatic retention were not all mandatory original deliverables. Track them as enhancements or production limitations instead of using them to conceal gaps in mandatory workflows. All newly finished work requires actual test evidence below and in IMPLEMENTATION_PROGRESS.md.

## Session evidence

Module 1: 14 security tests passed in 27.78 seconds, including draft audience, instructor notifications, archive restrictions and DOCX structure; Django check passed.

Modules 2–5: grading/terminology configuration, reporting pagination/streaming, role dashboards, platform institute details, natural-key constraints and term-aware scheduling implemented. Focused checks passed; full SQLite regression: **51 passed, 1 PostgreSQL-only skip**, 141.52 seconds. Frontend: **12 passed**, production build/typecheck passed. OpenAPI validation and migration-drift checks passed. PostgreSQL concurrency is executable in CI but not verified locally. Final browser rerun and final configuration-audit checks are recorded in IMPLEMENTATION_PROGRESS.md.

Final session evidence (11 October 2026): **52 backend passed, 1 PostgreSQL-only skip; 12 frontend passed; 12 distinct Chromium passed (11 together + one focused test)**. All current build/typecheck/schema/migration/system checks passed. New public platform settings and institute configuration audit tests passed. Local responsive screenshots refreshed. Remaining P/U entries and limitations are deliberately retained; no production or real-world model validation is claimed.


## Latest continuation evidence — 11 October 2026

Calendar date edits revalidate existing conflicts and serialize institute schedule mutations before validation. Quiz/question edits and bank-copy actions revalidate under quiz locks; submissions re-read parent/work under locks before resubmission decisions. Six deterministic stale-validation regressions pass; four actual PostgreSQL race tests exist but skip locally.

Super Admin global audit browsing is integrated, paginated, searchable, filtered and read-only. Route boundaries prevent unauthorized generic-page mounting, with breadcrumbs and save notifications. Instructor workload has a dedicated scoped page API and bounded legacy preview. Fixed all-course reports incorrectly omitting archived courses when the filter was absent. Explicit assessment action serializers reject malformed payloads and produce precise schemas.

Full backend **62 passed, 4 PostgreSQL-only skipped**; Chromium **15 passed** before the final selector milestone. Generic form and bank-copy choice lists now use bounded search/pagination; frontend **16 passed** after integration. Final browser results are recorded in IMPLEMENTATION_PROGRESS.md. All model/training and deployment limitations still apply.


## Final infrastructure and selector evidence

Later in the same continuation Docker Desktop became available. **66 PostgreSQL tests passed with no skips**, including four concurrency cases. Production images built and PostgreSQL/Gunicorn/Nginx health, TLS, compiled SPA, anonymous API denial and edge throttling passed. Database restoration preserved the fixture and 32 migration records. A 2,000-student reporting benchmark passed; measurements are in reporting-benchmark.json. These results supersede previous unexecuted-Docker/PostgreSQL rows, but do not verify hosted operations, real SMTP, certificate renewal or media/off-host disaster recovery.

Final frontend evidence: **16 component tests and 16 Chromium workflows passed**, plus build/typecheck and responsive visual checks. Generic forms/bank destinations now search and page choices without eagerly traversing the directory, retaining selected values. Filter/institute/roster selectors and aggregate schemas were subsequently implemented and tested; sustained-load tests and exhaustive role/CRUD/accessibility coverage remain partial. No real-world ML validation is claimed.


## Reporting, validation and roster follow-through

Authentication and invitation malformed values now produce typed field errors, and prediction history honors archived status. Report/resource/institute/account-link selectors load only a requested choice page. Attendance has a scoped 50-row roster with names and recorded status in bounded queries, atomic reviewed-page saves, edit retention after failures and student history with course/meeting/date context. Department counts run in SQL and group by unit UUID; a named "Unassigned" unit stays distinct from unassigned courses. Explicit nested schemas and response-contract tests now cover dashboards, reports, model status and remaining custom actions.

Focused verification: 10 attendance/workflow backend tests, 6 response/auth/action contract tests and the new attendance browser workflow passed. Latest full-suite totals are in IMPLEMENTATION_PROGRESS.md and testing.md. This updates earlier audit snapshots; no hosted production or real-data model-validation claim is made.

Current full-suite evidence: **73 PostgreSQL passed (zero skips); 69 SQLite passed (four PostgreSQL-only skips); 19 frontend passed; 17 Chromium passed together**. Runtime container smoke and updated reporting benchmark passed. The rapid-filter navigation failure discovered during regression was fixed and retested; it is not an outstanding failure. See the current handoff in IMPLEMENTATION_PROGRESS.md for remaining verification and external dependencies.


## Original-scope verification continuation — 11 October 2026

Concrete defects found and implemented in this continuation: quiz background refresh/in-flight-save draft loss; attempt failure hidden by a disabled query's loading state; missing student review of released manual feedback; fractional manual marks rejected by integer input stepping; existing short-answer grades not preloaded; module position ignored by list ordering; and department heads unable to select unused own-unit academic definitions. Tests also verify invitation setup, password strength, CSRF, token replay, disabled sessions and email-failure recovery. No redesign or staff expansion was started. See the latest progress handoff for final combined results.

Remaining *verification depth* (exhaustive CRUD/role permutations, formal accessibility audit, additional browsers, sustained high-load testing) must not be confused with a known absent core module. External SMTP/domain/recovery acceptance and lawful ML evaluation remain separate from local FYP functionality.


## Latest original-scope verification and remaining categories

All concrete functional defects found in the latest audit were fixed and verified: quiz draft retention and load errors, released manual feedback, decimal/manual quiz grading forms, module order, department-head first-offering selection, invitation failure recovery and explicit computed API fields. Course keyboard navigation and invitation/CSV/assessment browser workflows passed. There is no known missing core original FYP workflow identified by this audit; this is not a claim of exhaustive testing.

Current execution: **74 SQLite backend tests passed, four PostgreSQL-only skipped; 25 frontend tests passed; all 20 Chromium workflows passed together (2.3m)**. Typecheck/build, Django checks, migration drift and warning-free OpenAPI validation passed. PostgreSQL/Docker/production smoke results above are preceding-session evidence and were not repeated. No application database reset occurred.

The tested FYP baseline is ready for the separate improvement stage. Remaining work is (a) additional assurance such as hosted CI, more browsers, formal accessibility and sustained load, (b) real SMTP/domain TLS/off-host media recovery and approved privacy operations, and (c) ML evaluation with lawful real data. These are distinct from optional UI/staff expansion, GPA/transcripts, automated retention/antivirus/outbox or model registries. Synthetic estimates remain unvalidated for real student decisions. Mail is synchronous, SMTP operations have a default 10-second timeout, and password reset is the retry route after transport failure.
