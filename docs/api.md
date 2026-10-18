# API guide



Base path: `/api/v1/`. OpenAPI is available at `/api/schema/`; Swagger UI is `/api/docs/` (authentication required). The generated `backend/openapi.yaml` describes model resources. Some workflow/auth response schemas are generic objects; the concrete payload contracts below supplement them.



Authentication sequence:



1. `GET auth/csrf/` establishes the CSRF cookie.

2. `POST auth/login/` with `{ "username": "...", "password": "..." }`, cookie and `X-CSRFToken`.

3. Refresh the CSRF token after login (Django rotates it).

4. `GET auth/me/` returns permitted memberships and selected institute.

5. `POST auth/select-institute/` with `{ "institute_id": "uuid" }` changes context.



Other auth endpoints: `POST logout/`, `POST password-change/` (`old_password,new_password`), `POST password-reset/` (`email`), `POST password-confirm/` (`uid,token,new_password`); `PATCH me/` permits only first and last names.



Collections: platform-users (Super Admin only), institutes, memberships, units, years, terms, programs, sections, courses, offerings, enrollments, modules, lessons, materials, assignments, submissions, quizzes, questions, question-bank, attempts, manual-grades, attendance-sessions, attendance, timetable, announcements, notifications, audit. Read responses use `{count,next,previous,results}` and 50-row pages. Gradebook and prediction history use the same envelope with 25-row default pages (maximum 100 via `page_size`). Analytics endpoints return aggregate objects.



CRUD uses GET/POST/PATCH/DELETE as authorized. Submissions, attempts, attendance, notifications and audit deliberately restrict generic mutation. Membership uses POST/PATCH, institutes use activation rather than deletion. Most list APIs support course-specific filters; text search is provided on titles, names, and member details as configured. Invalid related ownership returns 400 or 403; invisible objects return 404. Anonymous protected requests return 403 with session authentication.



| Workflow | Payload / response |

|---|---|

| `POST lessons/{id}/complete/` | No body; idempotent completion |

| `GET materials/{id}/download/` | Authorized attachment stream |

| `GET assignments/{id}/download/` | Private supporting resource; assignment creation/edit accepts multipart `file` |

| `POST assignments/{id}/submit/` | `text` and/or `file`; JSON or multipart |

| `POST submissions/{id}/grade/` | `marks,feedback,released` (boolean) |

| `GET submissions/{id}/download/` | Authorized private submission attachment |

| `POST quizzes/{id}/start/` | New or active own attempt with server deadline |

| `POST attempts/{id}/save_answers/` | `answers: {question_uuid: string}` |

| `POST attempts/{id}/submit/` | Same answers object; expired requests finalize saved answers only |

| `POST attempts/{id}/grade/` | `manual_marks: {short_question_uuid: number}` |

| `GET {submissions,attempts,manual-grades}/{id}/grade-history/` | Staff-only, scoped, paginated grade changes; each route uses one resource name |

| `POST question-bank/{id}/copy-to-quiz/` | `quiz` UUID; validates destination access and locks |

| `POST attendance-sessions/{id}/mark/` | `records: [{student: uuid,status: present|absent|late|excused}]` |

| `POST notifications/{id}/read/` | Sets own notification read |

| `POST memberships/attach/` | Super Admin: existing `user` UUID, `role`, optional `unit` |

| `POST memberships/import-csv/` | Multipart UTF-8 CSV; all-or-nothing validation; errors include line/username/detail |

| `GET analytics/` | Scope-derived counts, attendance, first five gradebook rows, recorded activity types |

| `GET analytics/trends/` | 30-day activity, attendance, released assignment score points, assignment completion, authorized department averages and instructor workload |

| `GET grades/` | Paginated provisional released gradebook rows, letter grades and points |

| `GET reports/` | Staff-only CSV; spreadsheet formula prefixes escaped |

| `GET platform/` | Super Admin global counts |

| `GET platform-users/` | Super Admin global directory; search and active-status filter |

| `PATCH platform-users/{id}/` | Super Admin `is_active` only; protected administrator accounts |

| `GET model-status/` | ready/model_unavailable plus model metadata |

| `GET predictions/` | Paginated authorized saved estimates, newest first |

| `GET predictions/summary/` | Staff-only distribution of latest stored estimate per learner/course pair, count and experimental warning |

| `POST predictions/` | `student,offering`; ready/insufficient_data/model_unavailable |



Question answers are never serialized to students. Unreleased submission marks/feedback and quiz marks/manual grades are suppressed on every student API response. File URLs are authorization endpoints, not public media URLs.



Staff quiz responses include `has_attempts`; when true, the edit form sends only `released`. Quiz release notifies learners with completed scored attempts. The assignment score trend groups currently released marks by submission date; it is not a reconstruction of grades as known at past dates. Grade history contains draft grades and is restricted to authorized staff.





## Reporting filters and settings



`GET grades/` and `GET reports/` accept `offering`, `term`, `unit`, `student` UUIDs; `search` (learner username/name or offering title); and `archived=true|false`. Gradebook also accepts `page` and `page_size` (1–100). Filters only narrow the authorized queryset. CSV streams every matching row in batches of at most 100 enrollments, independent of the visible UI page, and includes manual percentages, letter grades and points. Ordering of CSV batches is by enrollment UUID; table pages sort by course and learner.



`GET predictions/` accepts the same UUID filters and `search` (username/course), plus pagination. It returns stored observations, not recalculated historical predictions. The risk summary uses the latest stored estimate per learner/course across the authorized scope. `GET assignments/` accepts `due_at__gte`, `due_at__lte`, `published` and `ordering=due_at`; the dashboard uses these to find the next deadlines before pagination.



`GET institutes/{id}/overview/` and `GET institutes/{id}/administrators/` are Super Admin only, independent of the selected institute. The first returns institute metadata, active counts by role, course and enrollment counts. The second returns paginated administrator memberships including inactive memberships. Enter an active institute to use the existing invitation/link/status workflows.



Institute admins can PATCH their selected institute's `terminology` and `grading_rules`. Terminology accepts singular and `_plural` labels for `unit,year,term,program,section,course,offering` (1–50 characters). Rules accept:



```json

{"pass_mark":50,"quiz_attempt_policy":"best","missing_category_policy":"normalize","bands":[{"label":"A","minimum":80,"points":4},{"label":"B","minimum":0,"points":2}]}

```



Bands are optional; labels must be unique, minimums strictly descending and the last minimum zero. Points range from 0 to 10. Repeated attempts are combined per quiz using `mean`, `best` or `latest`, then quiz percentages are equally averaged. Missing categories either `normalize` available category weights (default), or count as `zero` after at least one released weighted category exists. Letter points are provisional and are not a finalized GPA. Auth identity includes the authorized institute profile so terminology is used immediately by forms, navigation and tables.



`GET /health/` is liveness; `GET /ready/` executes a database connectivity query and returns 503 without connection details on failure. These endpoints do not require a session.





## Platform configuration



`GET platform-settings/` is intentionally public and returns only `platform_name`, `support_email`, `login_notice` and `updated_at`. It does not expose environment variables, secrets, memberships or private institute settings. `PATCH platform-settings/` requires Super Admin plus normal session CSRF protection. The platform name is nonempty and limited to 32 characters, support email is validated, and the plain-text notice is limited to 400 characters. Changes are recorded in Django admin LogEntry. These public values are rendered on login and in the sidebar. Secret database, email and security settings remain deployment environment variables.



Resource pages now expose existing server filters: People role/active/unit, platform account active status, offerings term/archived, enrollment active status, assignment/announcement published status, and timetable day. Filters remain in the URL; changing one resets pagination.





## Audit, workload and assessment contracts



`GET platform-audit/` and `GET platform-audit/{id}/` expose read-only Django platform events to Super Admin without requiring an active institute. Fields: id, action_time, actor, action, model, object_repr, change_message. Search matches actor username, object description and message. Filters: `action_flag=1|2|3` and `content_type__model=user|platformconfiguration` (other Django model names also supported). Uses standard 50-row pagination. Tenant activity remains in the independently scoped `audit/` endpoint.



`GET analytics/workload/` returns `{count,next,previous,results}` with 25 rows by default, maximum 100 using `page_size`. Rows contain instructor id/name, distinct assigned course count and distinct active enrolled learner count. Supports `search` (instructor username/name), `term`, `unit`, `archived`, `page`, `page_size`. Teachers see only their own workload; heads and admins remain within authorized course scope. Students receive 403. The legacy `analytics/trends/` workload array is now a preview capped at five, with `instructor_workload_preview_limit: 5`; use the paginated endpoint for all rows.



Omitting `archived` in report/workload filters includes both active and archived offerings. Sending `true` or `false` explicitly narrows the selection.



Assignment submit, submission grade, quiz start, attempt answer-save/submit/manual-grade, bulk attendance and bank-copy operations now have explicit OpenAPI request/response schemas. Grades accept nonnegative numbers with at most two decimal places, bounded by the relevant assessment maximum; nonfinite numbers are rejected. Feedback must be a string of at most 10,000 characters; the API rejects invalid values instead of silently coercing/truncating them. `released` requires a JSON boolean. Answer strings preserve whitespace and are capped at 10,000 characters. Expired attempts still ignore incoming answers and finalize previously saved work. Attendance accepts 1–500 records and validates enrolled UUIDs and statuses atomically.



Question edits, question-bank copies and quiz starts acquire the quiz lock before final validation. Assignment edits/submissions and submission grading re-read records under row locks. Calendar/schedule/offering writes serialize on the institute row before validation. These locks require PostgreSQL; SQLite regression checks validate stale preconditions but do not prove concurrent behavior.



## Authentication, reports and attendance roster contracts

Auth login/profile/institute selection/password endpoints and invitation/attachment inputs now validate typed values. Password fields preserve whitespace, reject nontext values and are capped at 4,096 characters. Profile names are limited to 150; invitation names reject excess lengths instead of truncating. Identity schemas include selected institute configuration and active memberships. CSV import documents the multipart file and created/error result. Errors remain standard DRF validation responses.

Report/dashboard/platform/trends/model status and risk-summary responses have explicit nested schemas. `grades/` documents validated query filters and its page envelope; `reports/` documents `text/csv` rather than a JSON object. `predictions/` documents separate generation and paginated-history responses; history honors `archived` as well as student/offering/unit/term/search. Completion, notification read, grade history and private downloads document their action-specific response shapes. Grade history remains staff-only; binary downloads require the same object authorization as the underlying record.

`GET attendance-sessions/{id}/roster/` returns `{count,next,previous,results}` in fixed 50-row pages. It accepts `page` and `search` (username/first/last name, up to 120 characters). Each result contains enrollment `id`, student UUID, `student_label`, and nullable recorded `status`. Only active enrollments of the authorized session are included. Students receive 403; unrelated courses or tenants are not retrievable. The query joins names and annotates recorded status without per-student queries.

`POST attendance-sessions/{id}/mark/` remains atomic for 1–500 requested records. It validates only the requested student IDs against active enrollment instead of materializing the entire roster. The frontend submits one reviewed page; it does not mark hidden students. Attendance history adds `session_label`, `session_date`, `offering`, and `offering_label` so students can identify the meeting. Department trends add nullable `unit_id` and aggregate distinct learner/course counts in SQL; the existing `unit` display label remains available.


## Original-scope contract corrections (11 October 2026)

Computed relation labels are now declared read-only string/nullable serializer fields and included in generated OpenAPI for academic and learning CRUD responses and memberships. Absent optional relations have a null label. Quiz `has_attempts` is documented and returned to authorized staff; it remains omitted for students. Attempt list/detail explicitly use `AttemptResult`, matching start/save/submit/grade output and result-release masking. These output fields cannot be used to change relationships.

Module lists default to position, creation time, then UUID. Heads can list course/program/section definitions throughout their own assigned unit before an offering exists; teachers/students continue to read only offering-linked definitions. Mutation permissions are unchanged.

SMTP/transport failures are logged by account UUID without recipients, exception bodies or tokens. They do not convert a committed invitation/import into HTTP 500. Public password reset has the same generic HTTP 200 response for existing and absent valid email addresses even during mail transport failure; clients must not interpret this as delivery confirmation. Retrying password reset uses the existing account. `EMAIL_TIMEOUT` defaults to 10 seconds per SMTP operation.

## Upgrade endpoints (12 October 2026)

- `POST /class-analysis/ {offering}` creates or resumes one active run/course. `GET /class-analysis/{id}/` reports counts/progress; `POST /class-analysis/{id}/advance/` processes at most ten candidates; `GET /class-analysis/{id}/items/?page=&page_size=&search=` returns paginated results. All actions enforce current course scope. Results include actual academic values, status, model version and prediction time when available. Completed runs remain reviewable; repeated analysis reuses unchanged successful outputs.
- `GET /my-agenda/` returns the authenticated student's published unfinished task counts and bounded upcoming/recently-overdue preview. Full assignment/quiz pages remain the complete lists.
- `PUT /auth/avatar/` accepts multipart `image`; `DELETE` removes the current picture; `GET` returns a private normalized JPEG. `GET /memberships/{id}/avatar/` requires authorized membership access. `GET /auth/me/` includes `avatar_url` and `notify_academic`; the existing profile `PATCH` accepts the academic notification Boolean alongside permitted names. No role, tenant or privileged account fields are editable through profile calls.

The generated OpenAPI file describes payloads and response contracts. Governance/finalization/approval are now integrated through the separately documented academic-control and correction routes.


## Final unified workflow additions

### Completion additions (14 October 2026)

- `POST /auth/select-workspace/ {academic_workspace: "department" | "teaching"}` selects a Department Head's session workspace. Teaching needs `can_teach` and course access still requires assignment. Identity includes workspace/capability; institute selection resets workspace. Withdrawn teaching appointments revoke affected course access.
- Institute `PATCH` accepts `grading_rules.lock_released_grades` and nullable `attendance_edit_window_days` (0–365). Changing either requires `policy_change_reason` of at least five characters and records prior/current policies. `academic-control` adds nullable `lock_reason`; the correction/emergency routes remain the authorized way to amend protected records.
- Gradebook/CSV, predictions, trends and workload accept `program`, `year`, `section`, and `batch` UUID filters in addition to their prior academic filters. Filters narrow the caller's scope and never grant access.
- `GET /analytics/courses/` returns paginated SQL course comparisons for academic staff. Supports academic filters, search and `ordering=title|-title|learners|-learners`. Counts describe active enrollments; assessment averages/distributions include released assignment grades only. Excused attendance is excluded; missing work means overdue published assignments without submissions. These are facts, not model estimates or weighted course grades.
- `GET /analytics/learner-progress/?offering=UUID&student=UUID&missing_only=false&page=1` returns one authorized learner's released gradebook summary and paginated published assignment status/feedback. Missing-only selects overdue unsubmitted assignments. Students can only request themselves in enrolled offerings. Unreleased marks/feedback are always omitted, including from staff progress summaries. Page size is at most 100.

- `GET/POST /teacher-appointments/`, `GET /teacher-appointments/candidates/`, `POST /teacher-appointments/{id}/withdraw/`: provision/eligibility and department appointment are separate. Head owns appointment; Admin configures eligibility.
- `POST /memberships/{id}/resend-invitation/`: authorized administrator resend; invalidates the prior invitation and returns fresh post-commit status. Overlapping queued requests are coalesced. Membership responses include independent setup state, expiry and delivery evidence: `pending` (queued/sending), `accepted` (SMTP accepted, not inbox delivery), `failed`, `local` (test capture), or historical `sent` (transport unknown). Creation reserves the invitation atomically; sending follows the outer commit. Existing usable passwords are never reset by an invitation. Activation shares the password-confirm endpoint but uses a distinct signed invitation token. Invitations 48h; resets 30m; password minimum 12. See [delivery investigation](invitation-delivery-20261018.md).
- `GET/POST/PATCH /curriculum/`, `/batches/`: tenant-scoped program-stage subject mapping and admission cohorts; Institute Admin writes. Structure resources include active/status fields and optional credits.
- `GET /institute-setup/`: Institute Admin's persisted-record checklist, not blanket institutional acceptance.
- `POST /admissions/`: preview defaults true; explicit preview=false commits identity, student membership, placement, selected enrollments and after-commit invitation. A UUID key supports safe retries. `GET /admissions/offerings/` is paginated and accepts program/year/batch/section/stage/term/search.
- `GET /memberships/{id}/placements/`: scoped historical placements. `POST /memberships/{id}/transfer/`: Admin-only reasoned placement transfer with explicit enroll/withdraw lists.
- `GET /academic-control/?kind=…&target=…`, `POST /academic-control/finalize/`: scoped record state and Admin finalization/reopening with reason. `POST /corrections/`, `GET /corrections/`, `POST /corrections/{id}/decide/`, `POST /corrections/emergency/`: correction proposals, independent review and explicit Admin overrides. Generated OpenAPI documents payload shapes. Standard role/object/tenant authorization applies before target retrieval.


## Institution architecture, progression and results (15 October 2026)

All paths below are relative to `/api/v1/`. The active session selects institute/role; filters never grant scope. Identity includes `institute_profile.academic_config` (departments, batches, annual/semester structure, default duration, direct teacher assignment, legacy type). New institutes require school/college/university. Existing ambiguous types are retained; ordinary type conversion is rejected.

- New Program defaults: school annual/1, college annual/2, university semester/8; college/university duration configurable up to 40. `Term.period_type` is annual/semester; blank means preserved legacy metadata. Periods remain within their year. Related academic identity cannot move after creation. Used program structures and placement stages cannot be reinterpreted by shortening duration/changing structure. Attendance dates must stay within the offering period; period edits cannot exclude stored attendance.
- School department/batch/Head appointment APIs reject access. School Admin assigns eligible active teachers directly. Other institutes retain Head-owned assignments and reasoned Admin override. `head_correction_review` explicitly delegates independent own-department correction review; it is unavailable in schools.
- Placement/admission input supports `stage` (1–40, within program duration) and optional `term`; each selected course must be compatible even when placement term is omitted. Selecting overlapping deliveries of one subject or retaining an overlapping transfer enrollment fails atomically.
- `POST memberships/{id}/progress/`: Admin-only. Required `operation=progress|repeat|correct|withdraw|complete|graduate`, `expected_placement` UUID, `reason` (5–1000 characters). Placement-changing actions require `target` using the placement schema. `preview` defaults true; response includes captured `evidence` and `evidence_token`. Commit sends `preview:false`, `confirm_review:true` and the exact reviewed token. Stale evidence/current placement rejects without mutation. Success creates a decision and, where applicable, a new placement, ends prior course access and preserves academic records. The configured `grading_rules.progression_policy` is `manual_review` (default) or `all_required_pass`; ML is never consulted.
- `GET academic-decisions/`: paginated authenticated student's own decisions. `GET memberships/{id}/progression-history/`: Admin or that student only, tenant-scoped. Includes recorded reason and captured academic evidence. Heads/teachers cannot use course access to retrieve a complete student's decision record.
- `GET academic-history/`: student-only paginated released gradebook rows for all own enrollments, including withdrawn/archived history. Adds period label and active flag. It does not reopen old course content or reveal unreleased grades.
- `GET academic-results/`: student-only own provisional GPA/CGPA. `GET memberships/{id}/academic-results/`: own-institute Admin only, including inactive student records. Returns status, notice, policy, separate program totals and per-period GPA/credits/attempts, plus exclusions. Disabled unless university `grading_rules.gpa_policy={"method":"credit_weighted","repeat":"all"|"latest"|"best"}` is explicitly configured with grade bands/points. Policy changes require `policy_change_reason`. Positive subject credits and released scores are required; failed released scores count. Results use current policy/credits and are not immutable transcripts. Both results and decision review cap historical enrollments at 1,000.
- Report APIs additionally accept `course` UUID and college `stage` 1–40. Study stage uses recorded matching period/year placements; unknown legacy stages are not inferred. Course comparisons, grades/CSV, trends, workload and prediction history share filtering. Program/section filters describe offering section relationships; unassigned shared offerings are not silently attributed to a program. Instructor workload `search` matches the instructor without narrowing their enrolled learner counts.
- Dashboard `structure_counts` is scoped and type-aware: program, section, course, active term; unit only where departments exist, batch only for university/cohort configuration. Non-management roles receive no management structure counts.

Calendar, course structure and attendance session writes lock the institute before validation/saving. Existing foreign-key immutability and academic-history deletion guards remain. No arbitrary model uploads or browser credential storage are introduced.

`GET platform/` additionally returns `institute_administrators`: distinct active users with an active Admin membership in an active institute. Multiple institute memberships do not double-count an administrator; no ordinary account directory is exposed.

## Public-data prediction contract (15 October 2026)

The active `GET model-status/` metadata has `mode:external_public`, `feature_schema:oulad-tma-sequence-v1`, `target:next_submitted_assignment_below_40`, source DOI/license/checksums, split counts, measured candidate/test/baseline metrics and thresholds. No artifact upload or training endpoint exists; training is a trusted local CLI operation.

`POST predictions/` and class analysis share version-specific input extraction. The public model requires two released/published past assignment scores with distinct deadlines plus an upcoming unsubmitted published assignment; no attendance minimum or quiz substitution. Inputs are `previous_assignment_pct` and `latest_assignment_pct`, each marks/max_marks ×100. Results return `model_info` (target/source/metrics/threshold snapshot) and `observations` (actual input assignment IDs/titles/scores/dates and upcoming assignment context). They remain separate from class result `academic` indicators. Prediction GET history includes these snapshots when available; legacy predictions remain unchanged with their original warning and feature schema.

Individual generation and class start/advance require a personally assigned instructor; a Head must use the capability-checked teaching workspace. Admin/Head read oversight remains scoped. Inactive learner membership, foreign course/student and revoked assignments fail closed. Each class advance rechecks authorization. Missing compatible observations yield `insufficient_data` with a specific reason; absent/corrupt/schema-mismatched artifacts yield `model_unavailable` without internal paths. Class re-analysis deduplicates identical model, scores, counts and assignment evidence; individual generation retains dated history as before. Summary counts exclude old/different-target predictions when the public model is active, and explicitly state their basis.
