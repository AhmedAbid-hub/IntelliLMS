# Requirement and acceptance audit

**Historical snapshot:** this table describes the 10 October baseline. Use [the current audit](audit-current.md), [progress](../IMPLEMENTATION_PROGRESS.md) and [limitations](limitations.md) for later implementations and verification. The old PostgreSQL, grading and roster gaps below have since been addressed.

Audit date: 10 October 2026. Status terms: **Complete and tested**, **Implemented but not fully tested**, **Partially implemented**, **Not implemented**. A tested item means the listed automated/local evidence exists; it does not mean exhaustive production validation.

| Specification area | Status | Actual scope / remaining gap |
|---|---|---|
| Monorepo, requested stack, real API and database models | Complete and tested | Django/React source, migrations and locked dependencies; no mock API backend |
| PostgreSQL deployment database | Implemented but not fully tested | psycopg, Compose, PostgreSQL CI job; host testing used explicit SQLite |
| Five roles, membership selection and institute isolation | Complete and tested | Negative tenant, department, teacher and student tests |
| Sessions, login/logout, CSRF | Complete and tested | CSRF negative test and browser login/logout cycles |
| Password change/reset, invitations, disabled access | Implemented but not fully tested | Working endpoints/forms and configurable transport; real SMTP untested |
| Platform institute administration and statistics | Implemented but not fully tested | CRUD/status, global counts, administrator invitation; no arbitrary platform configuration editor |
| Academic hierarchy, years, terms, programs/classes, sections | Complete and tested | Models/API/forms, date rules, browser unit/course creation; not every CRUD branch individually tested |
| Course definitions, offerings, teaching assignments, enrollment | Complete and tested | Full browser creation/assignment/enrollment workflow |
| Individual user management and multi-institute users | Complete and tested | Invite and membership role/unit/status; Super Admin directory, existing-user linking UI and global status updates; authorization/status tests and cross-institute linking browser workflow passed |
| CSV student/teacher import and error download | Complete and tested | Atomic API validation test and UI error CSV; browser import flow not individually exercised |
| Lessons/modules, ordering, visibility and completion | Complete and tested | Numeric ordering, published/future visibility checks, student completion browser test; no drag-and-drop editor |
| Private materials and submissions | Complete and tested | MIME/signature/size validation and authorization tests; no virus scanning |
| Assignment submit/deadline/resubmission/grade/release | Complete and tested | Full browser workflow and negative tests; private supporting resources on assignment definitions are implemented and access-tested |
| Quiz types, timing, attempt limit, auto/manual grading | Complete and tested | Backend expired/saved-answer/short-answer tests and browser auto-grade workflow |
| Question bank | Complete and tested | Author/department scope and copy-to-quiz tests; no random question sampling |
| Attendance marking, own history, percentages and audit | Complete and tested | Atomic bulk validation, no duplicate rows, percentage tests; UI traverses all roster/status pages and preserves existing marks |
| Manual assessments, weighted scores, pass threshold | Complete and tested | Manual release/tenant/weight tests; full configurable letter-grade schemes not implemented |
| Grade history and CSV export | Partially implemented | Dedicated staff grade-history UI for assignments, manual assessments and manually graded attempts; scoped CSV export; no finalized transcript |
| Timetable and conflict checks | Implemented but not fully tested | Weekly events and room/teacher/course overlap checks; no calendar exceptions or student cross-course conflicts |
| Announcements and notifications | Partially implemented | Scoped publishing/inbox/read state; new assignment, announcement, assignment/manual released-grade and scored quiz-release events; real SMTP delivery unverified |
| Upcoming deadlines | Complete and tested | Idempotent command; host scheduling remains operator configuration |
| Role dashboards and academic analytics | Complete and tested | Batched gradebook, scoped counts, completion, 30-day activity/attendance/released-assignment trends, department averages and instructor workload; trend data is not historical grade snapshots |
| Synthetic ML training and three-model comparison | Complete and tested | Actual training run, metrics, chart, artifact and pipeline tests |
| Trusted inference, permissions, data sufficiency | Complete and tested | Scoped API and insufficient-data tests; real cohort applicability unvalidated |
| Historical training mode | Implemented but not fully tested | CLI validation and grouped evaluation; no real historical dataset supplied and no browser training workflow |
| Prediction dashboard | Complete and tested | Model status, generating/reading estimates, probability/category/version/time, observation details and latest-per-learner/course risk distribution; real cohort validity remains unestablished |
| Student supportive insights | Complete and tested | Own released gradebook, lesson/assignment completion, attendance/activity counts and 30-day scoped trend charts |
| UI foundations, forms, table paging, loading/error states | Complete and tested | TypeScript build, component tests, Chromium workflow tests, desktop/mobile screenshot checks |
| Full accessibility and localization | Partially implemented | Labels, keyboard controls, Radix focus management, responsive layout; no formal accessibility audit, dark theme or localization |
| OpenAPI and consistent API errors | Partially implemented | Generated schema and API guide; some custom payload schemas remain generic objects |
| Docker, reverse proxy, persistent storage, backups | Implemented but not fully tested | Config and procedures written; Docker unavailable locally |
| Security/privacy governance and retention automation | Partially implemented | Security controls and procedure documented; no penetration test or automatic retention/deletion jobs |
| Comprehensive backend/frontend/E2E test matrix | Partially implemented | Key critical paths covered, not every original listed UI/permission permutation |
| Documentation, seed data, progress/handoff | Complete and tested | Files describe implemented behavior; seed and repeat run verified locally |
| Formal real-world predictive validation | Not implemented | Synthetic metrics are never presented as real-world validation |

The original definition of done is **not fully satisfied** because remaining administration, configurable grading/terminology refinements, comprehensive verification and production execution are outstanding. The application is locally demonstrable across its core academic and learning workflows.
