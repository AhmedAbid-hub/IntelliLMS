# Functional requirements

Each requirement below describes implemented behavior; broader original requirements are evaluated in requirements-audit.md.

| ID | Behavior | Implementation |
|---|---|---|
| FR01 | Authenticate, select an active institute, change/reset password | accounts/auth.py |
| FR02 | Enforce institute, department, course and self access | accounts/scope.py and scoped viewsets |
| FR03 | Manage academic units, years, terms, programs, sections and course definitions | academics models/views/serializers |
| FR04 | Assign teachers, create term offerings, enroll students | Offering and Enrollment APIs/forms |
| FR05 | Invite members individually or atomically from CSV | MembershipViewSet; configurable email backend |
| FR06 | Publish lessons, order modules/lessons, track completion | Learning APIs and course pages |
| FR07 | Validate and protect learning files and submitted attachments | Material/Submission download actions |
| FR08 | Enforce assignment deadlines, late policies and resubmission rules | Assignment.submit |
| FR09 | Grade assignments, give feedback, control release | Submission.grade |
| FR10 | Timed quizzes, attempt limits, answer saving, automated and manual grading | Quiz.start and Attempt actions |
| FR11 | Reusable private question banks | BankQuestion CRUD and copy-to-quiz action |
| FR12 | Bulk attendance and attendance percentages | AttendanceSession.mark and analytics |
| FR13 | Manual assessment marks and three-category weighted provisional grades | ManualGrade, Offering weights, gradebook service |
| FR14 | Institute pass threshold and terminology metadata | Institute settings |
| FR15 | Weekly timetable with room, offering and instructor overlap checks | Timetable serializer |
| FR16 | Audience-scoped announcements and personal notifications | Learning notification APIs |
| FR17 | Idempotent upcoming-deadline reminders | notify_deadlines management command |
| FR18 | Course/institute/department scope reports and CSV export | insights services/views |
| FR19 | Public OULAD sequence training/evaluation and schema-checked trusted inference; legacy synthetic/historical compatibility | ml/train.py and ml/inference.py |
| FR20 | Fictional demonstration data and automated workflow verification | seed_demo, pytest, Vitest, Playwright |

Academic terms are configurable date intervals; programs and sections model school grades and college/university structures. Question banks copy into quizzes instead of creating mutable shared live exam questions. Manual assessment weighting defaults to zero until explicitly configured; weights must total 100.


## Current architecture extensions

FR21: institution-type policy and adaptive workflows (school annual classes/direct assignments, college configurable annual study years, university configurable semesters/cohorts).

FR22: reviewed, audited and history-preserving progression/repetition/correction/withdrawal/completion/graduation, with stale-evidence protection and human-authorized policy.

FR23: learner self-only released history and captured decisions; complete program evidence is private to learner/Admin.

FR24: explicit configured provisional university credit-weighted GPA/CGPA, repeat rules, separate programs and disclosed exclusions; no universal grading scale is assumed.

FR25: institution-aware year/class/program/section/subject/course/study-year/batch/period reporting and scoped aggregate dashboards.

FR26: compatible periods, immutable academic relationships, protected calendar attendance boundaries and used program stages.

See [the current acceptance matrix](completion-acceptance.md) for verification and remaining assurance; prior original-scope documents do not override the active architecture request.

## FR27 — Public-data student performance prediction

Reuse individual estimates, prediction history, Analyze Class and authorized teacher workflows. Train reproducibly on license-verified real public data with student-group separation, compatible observed features, validation-only model/threshold selection, a simple baseline and measured holdout metrics. The implemented target is next submitted assignment below 40%, using two earlier assignment percentages; attendance/quiz/activity are not falsely mapped to source features. Preserve source/model/input evidence per estimate, old synthetic labels and institute/course permissions; refuse incompatible/missing records. Display external-data limitations and measured precision/recall/F1. No autonomous academic penalties, grade changes or progression decisions. See [real-data request](REAL_DATA_ML_REQUEST.md), [methodology](ml-methodology.md) and [evaluation](model-evaluation.md).
