# Frontend page, route and component map

## Contents

- [How to read the map](#how-to-read-the-map)
- [Role navigation](#role-navigation)
- [Dedicated routes and dashboards](#dedicated-routes-and-dashboards)
- [All configured resource pages](#all-configured-resource-pages)
- [Course tabs and major dialogs](#course-tabs-and-major-dialogs)
- [Shared components and utilities](#shared-components-and-utilities)
- [Quick-reference table](#quick-reference-table)

## How to read the map

Authority: [main.tsx](../frontend/src/main.tsx), [resource config](../frontend/src/features/resources/config.ts), [ResourcePage](../frontend/src/features/resources/ResourcePage.tsx), [Shell](../frontend/src/components/layouts/Shell.tsx) and actual backend scoping. **P** = Super Admin; **A** = Institute Admin; **H** = Department Head management workspace; **T** = Teacher, including a teaching-enabled Head in their teaching workspace; **S** = Student.

There are **24 router patterns**: 22 named/index/parameterized page patterns, one `/:resource` handler and one `/*` not-found handler. The generic handler recognizes **30 resource names**, giving **52 concrete page patterns** when expanded. Five role dashboards share the root route. Modal dialogs and course tabs below are additional UI surfaces, not invented URLs.

All API paths are relative to `/api/v1/`. [api.ts](../frontend/src/lib/api.ts) adds that prefix, session cookies and CSRF. A page's dropdowns also call their configured lookup resource. Parent paths in shorthand lists expand under the same resource. Backend links identify the entry view; supporting services and models are in [the backend map](BACKEND_CODE_MAP.md). Tests are related existing coverage, not a claim that every permutation has its own test.

## Role navigation

### Super Admin

Root `/` and `/platform` render Platform; `/institutes` lists institutes, `/institutes/:id` shows aggregate/administrator oversight, `/platform-users` manages administrative users, `/platform-settings` controls public branding, and `/platform-audit` lists global admin events. `/memberships` is restricted to Institute Admin appointments. Profile is shared; notifications require a selected institute. Academic teaching/student records are not platform powers.

### Institute Admin

Root Dashboard emphasizes institution setup/oversight. Academic structure/setup, admission, placement/progression, people/lifecycle, offerings/enrollment, settings, timetable, reports, audit and correction review are administration. Course learning tabs provide oversight; marking/content authoring and ML generation require instructor capabilities, not merely Admin status. Teacher appointments are read-only for Admin; eligibility is provisioned through people.

### Department Head

Root Dashboard and courses/people/reports are unit-scoped. Teacher appointments and teacher assignment edits belong to the Head. Correction decisions require explicit course delegation and an independent reviewer. HeadWorkspace switches to My Teaching only when `can_teach` is enabled; the effective role becomes Teacher and access follows personal assignments. There is no separate `/my-teaching` route. Schools do not have a Head workspace.

### Teacher

Root Dashboard, My courses, learning resources/assessment/attendance workflows, gradebook, academic progress, question bank and learning insights operate within assigned offerings. Review requests are available for protected records. The course workspace gathers these actions without creating a separate route per course tool.

### Student

Root Dashboard shows recorded learning progress and StudentPriorities. My courses exposes lessons/materials/assignments/quizzes/modules/My progress. Other shared pages include own attendance, gradebook, analytics, timetable, announcements, notifications, academic history and profile. QuizAttempt is student-only. Prediction risk pages are not student pages.

## Dedicated routes and dashboards

### Role-specific overview — `/`

| Item | Actual location / behavior |
|---|---|
| Roles | P/A/H/T/S |
| Main/supporting UI | [frontend/src/features/analytics/Dashboard.tsx](../frontend/src/features/analytics/Dashboard.tsx); WorkspaceHome → Platform or Dashboard; StudentPriorities, Workload previews |
| Calls / endpoints | `analytics/`; `assignments/`; `announcements/`; `my-agenda/ (P uses platform/ and institutes/)` |
| Backend | [insights/views.py](../backend/apps/insights/views.py) |
| Data | Offering, Enrollment, released records; platform aggregates |
| Related tests | [test_reporting.py](../backend/tests/test_reporting.py); [architecture-role-acceptance.spec.ts](../frontend/e2e/architecture-role-acceptance.spec.ts) |
| Purpose / first edit | Edit Dashboard role branches; Super Admin root uses Platform.tsx. |

### Sign in — `/login`

| Item | Actual location / behavior |
|---|---|
| Roles | Public |
| Main/supporting UI | [frontend/src/features/auth/Login.tsx](../frontend/src/features/auth/Login.tsx); Login; AuthProvider; platform branding |
| Calls / endpoints | `auth/csrf/`; `auth/login/`; `platform-settings/` |
| Backend | [accounts/auth.py](../backend/apps/accounts/auth.py) |
| Data | User, Membership, session |
| Related tests | [test_auth_and_inference.py](../backend/tests/test_auth_and_inference.py); [zzz-auth-policy.spec.ts](../frontend/e2e/zzz-auth-policy.spec.ts) |
| Purpose / first edit | Login form/validation here; session and CSRF rules in auth.py. |

### Password recovery — `/forgot-password`

| Item | Actual location / behavior |
|---|---|
| Roles | Public |
| Main/supporting UI | [frontend/src/features/auth/Login.tsx](../frontend/src/features/auth/Login.tsx); PasswordReset |
| Calls / endpoints | `auth/password-reset/` |
| Backend | [accounts/auth.py](../backend/apps/accounts/auth.py) |
| Data | User |
| Related tests | [test_invitation_policy.py](../backend/tests/test_invitation_policy.py); [assessment-invitations.spec.ts](../frontend/e2e/assessment-invitations.spec.ts) |
| Purpose / first edit | Keep neutral responses and throttling. |

### Reset / invitation password setup — `/reset/:uid/:token`

| Item | Actual location / behavior |
|---|---|
| Roles | Public with valid link |
| Main/supporting UI | [frontend/src/features/auth/Login.tsx](../frontend/src/features/auth/Login.tsx); PasswordReset |
| Calls / endpoints | `auth/password-confirm/` |
| Backend | [accounts/auth.py](../backend/apps/accounts/auth.py) |
| Data | User, AccountInvitation |
| Related tests | [test_invitation_policy.py](../backend/tests/test_invitation_policy.py); [zzz-auth-policy.spec.ts](../frontend/e2e/zzz-auth-policy.spec.ts) |
| Purpose / first edit | Shared invitation/reset path; inspect invitations.py for expiry/version. |

### Platform overview — `/platform`

| Item | Actual location / behavior |
|---|---|
| Roles | P |
| Main/supporting UI | [frontend/src/features/analytics/Platform.tsx](../frontend/src/features/analytics/Platform.tsx); Platform; institute list/overview controls |
| Calls / endpoints | `platform/`; `institutes/`; `model-status/` |
| Backend | [insights/views.py](../backend/apps/insights/views.py) |
| Data | Institute, administrative User/Membership aggregates |
| Related tests | [test_platform_accounts.py](../backend/tests/test_platform_accounts.py); [platform-settings.spec.ts](../frontend/e2e/platform-settings.spec.ts) |
| Purpose / first edit | Change global metrics in Platform and platform() together. |

### Platform branding settings — `/platform-settings`

| Item | Actual location / behavior |
|---|---|
| Roles | P |
| Main/supporting UI | [frontend/src/features/auth/PlatformSettings.tsx](../frontend/src/features/auth/PlatformSettings.tsx); PlatformSettings; usePlatformConfiguration |
| Calls / endpoints | `platform-settings/ GET/PATCH` |
| Backend | [accounts/platform.py](../backend/apps/accounts/platform.py) |
| Data | PlatformConfiguration |
| Related tests | [test_platform_configuration.py](../backend/tests/test_platform_configuration.py); [platform-settings.spec.ts](../frontend/e2e/platform-settings.spec.ts) |
| Purpose / first edit | Public read fields also appear at login/sidebar. |

### Institute oversight — `/institutes/:id`

| Item | Actual location / behavior |
|---|---|
| Roles | P |
| Main/supporting UI | [frontend/src/features/analytics/Platform.tsx](../frontend/src/features/analytics/Platform.tsx); Platform; ResourceForm/LinkAccount admin management |
| Calls / endpoints | `institutes/{id}/overview/`; `institutes/{id}/administrators/`; `memberships/`; `memberships/attach/` |
| Backend | [accounts/views.py](../backend/apps/accounts/views.py) |
| Data | Institute, administrator Membership/User |
| Related tests | [test_platform_accounts.py](../backend/tests/test_platform_accounts.py); [architecture-role-acceptance.spec.ts](../frontend/e2e/architecture-role-acceptance.spec.ts) |
| Purpose / first edit | Keep ordinary teachers/students out of platform directory. |

### Terminology and academic policies — `/institute-settings`

| Item | Actual location / behavior |
|---|---|
| Roles | A |
| Main/supporting UI | [frontend/src/features/auth/InstituteSettings.tsx](../frontend/src/features/auth/InstituteSettings.tsx); InstituteSettings; policy/band form controls |
| Calls / endpoints | `institutes/{id}/ GET/PATCH` |
| Backend | [accounts/views.py](../backend/apps/accounts/views.py) |
| Data | Institute.terminology/grading_rules |
| Related tests | [test_institute_configuration.py](../backend/tests/test_institute_configuration.py); [completion-policy-report.spec.ts](../frontend/e2e/completion-policy-report.spec.ts) |
| Purpose / first edit | Coordinate configuration.py, gradebook, academic_results and policies. |

### Reviewed student admission — `/student-admission`

| Item | Actual location / behavior |
|---|---|
| Roles | A |
| Main/supporting UI | [frontend/src/features/resources/StudentAdmission.tsx](../frontend/src/features/resources/StudentAdmission.tsx); StudentAdmission; placement selectors; RelationSelect |
| Calls / endpoints | `admissions/`; `admissions/offerings/`; `memberships/{id}/`; `academic structure selectors` |
| Backend | [academics/admission.py](../backend/apps/academics/admission.py) |
| Data | User, Membership, StudentPlacement, AdmissionReceipt, Enrollment |
| Related tests | [test_admission.py](../backend/tests/test_admission.py); [zzz-admission.spec.ts](../frontend/e2e/zzz-admission.spec.ts) |
| Purpose / first edit | Keep preview and idempotency key paired with commit. |

### Own retained academic results — `/academic-history`

| Item | Actual location / behavior |
|---|---|
| Roles | S |
| Main/supporting UI | [frontend/src/features/analytics/AcademicHistory.tsx](../frontend/src/features/analytics/AcademicHistory.tsx); AcademicHistory; AcademicResults; AcademicDecisions |
| Calls / endpoints | `academic-history/`; `academic-results/`; `academic-decisions/` |
| Backend | [academics/progression.py](../backend/apps/academics/progression.py) |
| Data | Enrollment, ProgressionDecision, released records |
| Related tests | [test_progression.py](../backend/tests/test_progression.py); [architecture-school.spec.ts](../frontend/e2e/architecture-school.spec.ts) |
| Purpose / first edit | Preserve former-enrollment history without reopening course access. |

### Student placement and progression — `/student-placement/:id`

| Item | Actual location / behavior |
|---|---|
| Roles | A |
| Main/supporting UI | [frontend/src/features/resources/StudentAdmission.tsx](../frontend/src/features/resources/StudentAdmission.tsx); StudentPlacement; StudentProgression; AcademicResults; AcademicDecisions |
| Calls / endpoints | `memberships/{id}/`; `placements/`; `transfer/`; `progress/`; `progression-history/`; `academic-results/ under that member`; `enrollments/` |
| Backend | [academics/admission.py](../backend/apps/academics/admission.py) |
| Data | Membership, StudentPlacement, Enrollment, ProgressionDecision |
| Related tests | [test_progression.py](../backend/tests/test_progression.py); [completion-fresh-institute.spec.ts](../frontend/e2e/completion-fresh-institute.spec.ts) |
| Purpose / first edit | Placement/transfer in StudentAdmission; reviewed decisions in StudentProgression. |

### Correction review queue — `/academic-reviews`

| Item | Actual location / behavior |
|---|---|
| Roles | A/H/T |
| Main/supporting UI | [frontend/src/features/resources/AcademicControl.tsx](../frontend/src/features/resources/AcademicControl.tsx); AcademicReviews; correction review dialog |
| Calls / endpoints | `corrections/`; `corrections/{id}/decide/`; `academic-control/` |
| Backend | [learning/governance.py](../backend/apps/learning/governance.py) |
| Data | CorrectionRequest, original target, Audit |
| Related tests | [test_governance.py](../backend/tests/test_governance.py); [zzz-governance.spec.ts](../frontend/e2e/zzz-governance.spec.ts) |
| Purpose / first edit | A/delegated H decide others' requests; T sees authorized requests. |

### Setup readiness checklist — `/institute-setup`

| Item | Actual location / behavior |
|---|---|
| Roles | A |
| Main/supporting UI | [frontend/src/features/resources/InstituteSetup.tsx](../frontend/src/features/resources/InstituteSetup.tsx); InstituteSetup |
| Calls / endpoints | `institute-setup/` |
| Backend | [academics/setup.py](../backend/apps/academics/setup.py) |
| Data | Academic structures aggregated |
| Related tests | [test_curriculum_setup.py](../backend/tests/test_curriculum_setup.py); [zz-academic-setup.spec.ts](../frontend/e2e/zz-academic-setup.spec.ts) |
| Purpose / first edit | Readiness rules/counts in setup.py; cards link existing forms. |

### Academic structure navigation — `/academics`

| Item | Actual location / behavior |
|---|---|
| Roles | A |
| Main/supporting UI | [frontend/src/features/resources/Academics.tsx](../frontend/src/features/resources/Academics.tsx); Academics; useInstitution/useTerminology |
| Calls / endpoints | `No direct API`; `links resource pages`; `auth identity supplies type` |
| Backend | [accounts/institution.py](../backend/apps/accounts/institution.py) |
| Data | Institute + linked academic structures |
| Related tests | [test_institution_rules.py](../backend/tests/test_institution_rules.py); [architecture-school.spec.ts](../frontend/e2e/architecture-school.spec.ts) |
| Purpose / first edit | Change grouped links/type labels here, forms in ResourceForm. |

### Department appointments — `/teacher-appointments`

| Item | Actual location / behavior |
|---|---|
| Roles | A read / H manage |
| Main/supporting UI | [frontend/src/features/resources/TeacherAppointments.tsx](../frontend/src/features/resources/TeacherAppointments.tsx); TeacherAppointments; RelationSelect; reasoned dialogs |
| Calls / endpoints | `teacher-appointments/`; `candidates/`; `{id}/withdraw/` |
| Backend | [accounts/appointments.py](../backend/apps/accounts/appointments.py) |
| Data | TeacherAppointment, Membership, Unit, Offering |
| Related tests | [test_teacher_appointments.py](../backend/tests/test_teacher_appointments.py); [appointment-dropdown.spec.ts](../frontend/e2e/appointment-dropdown.spec.ts) |
| Purpose / first edit | Candidate API returns Membership IDs; Head own unit only; no schools. |

### Unified course workspace — `/course/:id`

| Item | Actual location / behavior |
|---|---|
| Roles | A/H/T/S |
| Main/supporting UI | [frontend/src/features/courses/CourseDetail.tsx](../frontend/src/features/courses/CourseDetail.tsx); CourseDetail; ResourcePage; Gradebook; Trends; Predictions; LearnerProgress; BulkEnrollment |
| Calls / endpoints | `offerings/{id}/ plus active tab APIs` |
| Backend | [academics/views.py](../backend/apps/academics/views.py) |
| Data | Offering plus learning/insights records |
| Related tests | [test_workflows.py](../backend/tests/test_workflows.py); [learning.spec.ts](../frontend/e2e/learning.spec.ts) |
| Purpose / first edit | Tabs are local state, not nested routes; keep offering filter on every tab. |

### Gradebook — `/grades`

| Item | Actual location / behavior |
|---|---|
| Roles | A/H/T/S |
| Main/supporting UI | [frontend/src/features/analytics/Gradebook.tsx](../frontend/src/features/analytics/Gradebook.tsx); Gradebook re-exported by Dashboard; ReportFilters/Pagination |
| Calls / endpoints | `grades/`; `reports/ (staff export)`; `filter selectors` |
| Backend | [insights/views.py](../backend/apps/insights/views.py) |
| Data | Enrollment; released Submission/Attempt/ManualGrade; Attendance |
| Related tests | [test_reporting.py](../backend/tests/test_reporting.py); [reporting.spec.ts](../frontend/e2e/reporting.spec.ts) |
| Purpose / first edit | Calculations live in insights/gradebook.py; UI is read/report. |

### Academic progress and reports — `/analytics`

| Item | Actual location / behavior |
|---|---|
| Roles | A/H/T/S |
| Main/supporting UI | [frontend/src/features/analytics/Trends.tsx](../frontend/src/features/analytics/Trends.tsx); Trends; CourseComparisons; Workload; ReportFilters |
| Calls / endpoints | `analytics/trends/`; `analytics/courses/`; `analytics/workload/`; `reports/ as allowed` |
| Backend | [insights/reporting.py](../backend/apps/insights/reporting.py) |
| Data | Actual learning records; scoped enrollment pairs |
| Related tests | [test_course_comparisons.py](../backend/tests/test_course_comparisons.py); [completion-policy-report.spec.ts](../frontend/e2e/completion-policy-report.spec.ts) |
| Purpose / first edit | Keep aggregate indicators distinct from weighted grades and ML estimates. |

### Experimental learning insights — `/predictions`

| Item | Actual location / behavior |
|---|---|
| Roles | A/H read / T generate |
| Main/supporting UI | [frontend/src/features/analytics/Predictions.tsx](../frontend/src/features/analytics/Predictions.tsx); Predictions; ClassAnalysis; PredictionContext; report filters |
| Calls / endpoints | `model-status/`; `predictions/`; `predictions/summary/`; `grades/`; `class-analysis/ actions` |
| Backend | [insights/views.py](../backend/apps/insights/views.py) |
| Data | Prediction, AnalysisRun, AnalysisItem, actual released Submission |
| Related tests | [test_public_model.py](../backend/tests/test_public_model.py); [real-data-ml.spec.ts](../frontend/e2e/real-data-ml.spec.ts) |
| Purpose / first edit | Change API/history + class batch + public target notice together. |

### Profile and security — `/profile`

| Item | Actual location / behavior |
|---|---|
| Roles | P/A/H/T/S |
| Main/supporting UI | [frontend/src/features/auth/Profile.tsx](../frontend/src/features/auth/Profile.tsx); Profile; ProfilePicture; Avatar |
| Calls / endpoints | `auth/me/ GET/PATCH`; `auth/avatar/ GET/PUT/DELETE`; `auth/password-change/` |
| Backend | [accounts/auth.py](../backend/apps/accounts/auth.py) |
| Data | User; avatar private file |
| Related tests | [test_profile_images.py](../backend/tests/test_profile_images.py); [z-upgrade.spec.ts](../frontend/e2e/z-upgrade.spec.ts) |
| Purpose / first edit | Keep notify_academic preference and image authorization separate from role changes. |

### Take a quiz — `/quiz-attempt/:id`

| Item | Actual location / behavior |
|---|---|
| Roles | S |
| Main/supporting UI | [frontend/src/features/quizzes/QuizAttempt.tsx](../frontend/src/features/quizzes/QuizAttempt.tsx); QuizAttempt; question controls; server deadline handling |
| Calls / endpoints | `attempts/{id}/`; `questions/?quiz=`; `attempts/{id}/save_answers/`; `attempts/{id}/submit/` |
| Backend | [learning/views.py](../backend/apps/learning/views.py) |
| Data | Attempt, Quiz, Question |
| Related tests | [test_assessment_extras.py](../backend/tests/test_assessment_extras.py); [learning.spec.ts](../frontend/e2e/learning.spec.ts) |
| Purpose / first edit | Attempt ID comes from quizzes/{id}/start/; server timing is authoritative. |

### Access unavailable — `/unauthorized`

| Item | Actual location / behavior |
|---|---|
| Roles | Signed-in users |
| Main/supporting UI | [frontend/src/main.tsx](../frontend/src/main.tsx); Inline route element |
| Calls / endpoints | `None` |
| Backend | No backend handler |
| Data | None |
| Related tests | [test_platform_separation.py](../backend/tests/test_platform_separation.py); [architecture-role-acceptance.spec.ts](../frontend/e2e/architecture-role-acceptance.spec.ts) |
| Purpose / first edit | UI message only; change permissions in access.ts and backend, not this page. |

The `/*` not-found element is inline in main.tsx and has no API. An unknown single segment first reaches ResourcePage, which renders its unavailable/unknown resource state; it does not create a new backend resource.

## All configured resource pages

Every row below renders **ResourcePage** at `/<resource>`, optionally also embedded by CourseDetail with an offering filter. Supporting components: [ResourceForm](../frontend/src/features/resources/ResourceForm.tsx), [ResourceFilters](../frontend/src/features/resources/ResourceFilters.tsx), [WorkflowDialog](../frontend/src/features/resources/WorkflowDialog.tsx), [config.ts](../frontend/src/features/resources/config.ts), [RelationSelect](../frontend/src/components/RelationSelect.tsx) and [ReportControls](../frontend/src/components/ReportControls.tsx). To change columns/labels, start in config; to change role-sensitive actions/cards, start in ResourcePage; to change field dependencies, start in ResourceForm.

| Page / URL | Actual role behavior | Primary API / backend / model | Purpose and related tests |
|---|---|---|---|
| **Platform audit** `/platform-audit` | P read | `platform-audit/` → [PlatformAuditViewSet](../backend/apps/accounts/platform.py); Django admin.LogEntry | Global account and configuration changes. Institute activity remains in the selected institute's audit history. [test_platform_audit.py](../backend/tests/test_platform_audit.py), [audit-access-workload.spec.ts](../frontend/e2e/audit-access-workload.spec.ts) |
| **Institute Administrators & Platform Access** `/platform-users` | P account access controls | `platform-users/` → [PlatformUserViewSet](../backend/apps/accounts/platform.py); User | Manage administrative accounts and Institute Admin appointments. Ordinary academic accounts are managed inside their institute. [test_platform_accounts.py](../backend/tests/test_platform_accounts.py), [platform-settings.spec.ts](../frontend/e2e/platform-settings.spec.ts) |
| **Institutes** `/institutes` | P create/manage | `institutes/` → [InstituteViewSet](../backend/apps/accounts/views.py); Institute | Independent communities, connected through one platform. [test_platform_accounts.py](../backend/tests/test_platform_accounts.py), [platform-settings.spec.ts](../frontend/e2e/platform-settings.spec.ts) |
| **Academic units** `/units` | A writes; H/T/S related structure reads; denied in schools | `units/` → [UnitViewSet](../backend/apps/academics/views.py); Unit | Departments, faculties, and flexible academic units. [test_institution_rules.py](../backend/tests/test_institution_rules.py), [architecture-school.spec.ts](../frontend/e2e/architecture-school.spec.ts) |
| **Academic years** `/years` | A writes; institute scoped reads | `years/` → [YearViewSet](../backend/apps/academics/views.py); Year | Define the academic calendar for your institute. [test_period_integrity.py](../backend/tests/test_period_integrity.py), [zz-academic-setup.spec.ts](../frontend/e2e/zz-academic-setup.spec.ts) |
| **Terms & semesters** `/terms` | A writes; institute scoped reads | `terms/` → [TermViewSet](../backend/apps/academics/views.py); Term | Keep course delivery aligned with your academic year. [test_period_integrity.py](../backend/tests/test_period_integrity.py), [zz-academic-setup.spec.ts](../frontend/e2e/zz-academic-setup.spec.ts) |
| **Programs & grades** `/programs` | A writes; related scoped reads | `programs/` → [ProgramViewSet](../backend/apps/academics/views.py); Program | Configure degree programs, school grades, or college streams. [test_curriculum_setup.py](../backend/tests/test_curriculum_setup.py), [zz-academic-setup.spec.ts](../frontend/e2e/zz-academic-setup.spec.ts) |
| **Admission batches** `/batches` | A writes; scoped reads; denied in schools; college UI hidden | `batches/` → [AdmissionBatchViewSet](../backend/apps/academics/views.py); AdmissionBatch | Group admissions by program and entry year. Archive completed cohorts without deleting history. [test_curriculum_setup.py](../backend/tests/test_curriculum_setup.py), [completion-fresh-institute.spec.ts](../frontend/e2e/completion-fresh-institute.spec.ts) |
| **Curriculum** `/curriculum` | A writes; related scoped reads | `curriculum/` → [CurriculumItemViewSet](../backend/apps/academics/views.py); CurriculumItem | Map reusable subjects to a program semester or year. Required and elective subjects can be shared across programs. [test_curriculum_setup.py](../backend/tests/test_curriculum_setup.py), [zz-academic-setup.spec.ts](../frontend/e2e/zz-academic-setup.spec.ts) |
| **Class sections** `/sections` | A writes; related scoped reads | `sections/` → [SectionViewSet](../backend/apps/academics/views.py); Section | Organize learners into classes within a program. [test_admission.py](../backend/tests/test_admission.py), [zzz-admission.spec.ts](../frontend/e2e/zzz-admission.spec.ts) |
| **Course catalog** `/courses` | A writes; related scoped reads | `courses/` → [CourseViewSet](../backend/apps/academics/views.py); Course | Reusable subject definitions for your academic offerings. [test_academic_continuation.py](../backend/tests/test_academic_continuation.py), [zz-academic-setup.spec.ts](../frontend/e2e/zz-academic-setup.spec.ts) |
| **My courses** `/offerings` | A details/create; H teachers-only edits; T/S scoped read | `offerings/` → [OfferingViewSet](../backend/apps/academics/views.py); Offering | A home for your lessons, assessments, and learning community. [test_teaching_assignments.py](../backend/tests/test_teaching_assignments.py), [continuation.spec.ts](../frontend/e2e/continuation.spec.ts) |
| **People** `/memberships` | P admin members; A manages people; H/T scoped roster read | `memberships/` → [MembershipViewSet](../backend/apps/accounts/views.py); Membership | Manage institute memberships and invite learners and educators. [test_staff_lifecycle.py](../backend/tests/test_staff_lifecycle.py), [z-upgrade.spec.ts](../frontend/e2e/z-upgrade.spec.ts) |
| **Enrollments** `/enrollments` | A/H/T/S scoped read; mutation only dedicated actions | `enrollments/` → [EnrollmentViewSet](../backend/apps/academics/views.py); Enrollment | Review enrollment history. Manage student enrollment and withdrawals from each course. [test_bulk_enrollment.py](../backend/tests/test_bulk_enrollment.py), [z-upgrade.spec.ts](../frontend/e2e/z-upgrade.spec.ts) |
| **Learning modules** `/modules` | T author; A/H oversight; S enrolled read | `modules/` → [ModuleViewSet](../backend/apps/learning/views.py); Module | Group course content into a clear learning sequence. [test_workflows.py](../backend/tests/test_workflows.py), [learning.spec.ts](../frontend/e2e/learning.spec.ts) |
| **Lessons** `/lessons` | T author; A/H oversight; S published/visible read + completion | `lessons/` → [LessonViewSet](../backend/apps/learning/views.py); Lesson | Read, reflect, and take the next step in your course. [test_workflows.py](../backend/tests/test_workflows.py), [learning.spec.ts](../frontend/e2e/learning.spec.ts) |
| **Learning materials** `/materials` | T author; A/H oversight; S visible lesson files | `materials/` → [MaterialViewSet](../backend/apps/learning/views.py); Material | Secure resources available to your course community. [test_security_audit.py](../backend/tests/test_security_audit.py), [learning.spec.ts](../frontend/e2e/learning.spec.ts) |
| **Assignments** `/assignments` | T author/grade; A/H oversight; S published assignments/own submission | `assignments/` → [AssignmentViewSet](../backend/apps/learning/views.py); Assignment | Put your learning into practice. Every submission is a step forward. [test_assessment_extras.py](../backend/tests/test_assessment_extras.py), [learning.spec.ts](../frontend/e2e/learning.spec.ts) |
| **Quizzes** `/quizzes` | T author/release; A/H oversight; S available assessment/start | `quizzes/` → [QuizViewSet](../backend/apps/learning/views.py); Quiz | Check your understanding and build confidence through practice. [test_quiz_authoring.py](../backend/tests/test_quiz_authoring.py), [z-upgrade.spec.ts](../frontend/e2e/z-upgrade.spec.ts) |
| **Quiz questions** `/questions` | T author; A/H oversight; S authorized attempt questions without answer leakage | `questions/` → [QuestionViewSet](../backend/apps/learning/views.py); Question | Create multiple choice, true/false, and short answer questions. [test_quiz_authoring.py](../backend/tests/test_quiz_authoring.py), [z-upgrade.spec.ts](../frontend/e2e/z-upgrade.spec.ts) |
| **Manual assessment grades** `/manual-grades` | T mark/release; A/H oversight; S own released rows | `manual-grades/` → [ManualGradeViewSet](../backend/apps/learning/views.py); ManualGrade | Released marks for practical, oral, and other instructor-assessed work. [test_stability_authorization.py](../backend/tests/test_stability_authorization.py), [zzz-governance.spec.ts](../frontend/e2e/zzz-governance.spec.ts) |
| **Question bank** `/question-bank` | T author; A/H scoped oversight; no S | `question-bank/` → [BankQuestionViewSet](../backend/apps/learning/views.py); BankQuestion | Reusable questions for your teaching. Copy a question into a quiz before attempts begin. [test_quiz_authoring.py](../backend/tests/test_quiz_authoring.py), [z-upgrade.spec.ts](../frontend/e2e/z-upgrade.spec.ts) |
| **Submissions** `/submissions` | T grade; A/H oversight; S own submission + released marks | `submissions/` → [SubmissionViewSet](../backend/apps/learning/views.py); Submission | Review work, give constructive feedback, and release grades. [test_stability_grading.py](../backend/tests/test_stability_grading.py), [learning.spec.ts](../frontend/e2e/learning.spec.ts) |
| **Quiz attempts** `/attempts` | T grade; A/H oversight; S own attempts | `attempts/` → [AttemptViewSet](../backend/apps/learning/views.py); Attempt | Review quiz answers and grade short answer questions. [test_assessment_extras.py](../backend/tests/test_assessment_extras.py), [learning.spec.ts](../frontend/e2e/learning.spec.ts) |
| **Attendance** `/attendance-sessions` | T create/mark; A/H oversight; S scope readable but no staff marking UI | `attendance-sessions/` → [AttendanceSessionViewSet](../backend/apps/learning/views.py); AttendanceSession | Record attendance and recognize consistent participation. [test_attendance_roster.py](../backend/tests/test_attendance_roster.py), [attendance.spec.ts](../frontend/e2e/attendance.spec.ts) |
| **My attendance** `/attendance` | A/H/T scoped history; S own read | `attendance/` → [AttendanceViewSet](../backend/apps/learning/views.py); Attendance | Your attendance history across enrolled courses. [test_attendance_roster.py](../backend/tests/test_attendance_roster.py), [attendance.spec.ts](../frontend/e2e/attendance.spec.ts) |
| **Timetable** `/timetable` | A manage; H/T/S scoped read | `timetable/` → [TimetableViewSet](../backend/apps/academics/views.py); Timetable | Your week, with space for learning. [test_academic_continuation.py](../backend/tests/test_academic_continuation.py), [continuation.spec.ts](../frontend/e2e/continuation.spec.ts) |
| **Announcements** `/announcements` | A institute, H unit, T offering authoring; S published scoped read | `announcements/` → [AnnouncementViewSet](../backend/apps/learning/views.py); Announcement | Stay connected to what’s happening in your academic community. [test_notifications.py](../backend/tests/test_notifications.py), [continuation.spec.ts](../frontend/e2e/continuation.spec.ts) |
| **Notifications** `/notifications` | Own user + selected institute for P/A/H/T/S | `notifications/` → [NotificationViewSet](../backend/apps/learning/views.py); Notification | Updates on your assignments, feedback, and community. [test_notifications.py](../backend/tests/test_notifications.py), [z-upgrade.spec.ts](../frontend/e2e/z-upgrade.spec.ts) |
| **Audit history** `/audit` | A read-only; platform uses platform-audit | `audit/` → [AuditViewSet](../backend/apps/insights/views.py); Audit | A record of sensitive changes within this institute. [test_security.py](../backend/tests/test_security.py), [audit-access-workload.spec.ts](../frontend/e2e/audit-access-workload.spec.ts) |

## Course tabs and major dialogs

CourseDetail has twelve possible tabs: overview, lessons, materials, assignments, quizzes, modules, progress, enrollments, attendance-sessions, grades, performance, insights. Students receive the six learning/progress tabs; staff get all twelve. Local state switches tabs; `/course/:id/grades` is not a registered route.

| Component / file | Host / roles | API and backend/model path | Purpose / edit point / coverage |
|---|---|---|---|
| [resources/ResourceForm.tsx](../frontend/src/features/resources/ResourceForm.tsx) | ResourcePage; authorized writers | resource list POST/detail PATCH; academics/serializers.py and learning/serializers.py; selected model | Field dependency, validation, teacher eligibility, institute type; workflows.test.tsx and selectors.spec.ts. |
| [resources/WorkflowDialog.tsx](../frontend/src/features/resources/WorkflowDialog.tsx) | Learning resource rows; S own work / T grading / oversight reads | lesson complete, assignment submit, submission grade, quiz start, attempt grade; learning/views.py | Shared lesson/content/submission/review flows; workflow, learning and assessment browser tests. |
| [resources/AttendanceRoster.tsx](../frontend/src/features/resources/AttendanceRoster.tsx) | Attendance meeting dialog; T writes, A/H reads | attendance-sessions/{id}/roster/ + mark/; learning/roster.py + views.py; Attendance | Server pages, saved statuses, retry-safe page edits; test_attendance_roster.py / attendance.spec.ts. |
| [resources/AcademicControl.tsx](../frontend/src/features/resources/AcademicControl.tsx) | Record action + review queue; A/H/T | academic-control/, finalize/, corrections/, emergency/, decide/; governance.py; CorrectionRequest | Show lock/review consequences, proposed values and independent decisions; test_governance.py. |
| [resources/GradeHistory.tsx](../frontend/src/features/resources/GradeHistory.tsx) | Submission/attempt/manual-grade rows | {resource}/{id}/grade-history/; learning/history.py; Audit | Paged past grade changes; test_assessment_extras.py. |
| [resources/StaffLifecycle.tsx](../frontend/src/features/resources/StaffLifecycle.tsx) | People row; A or P for Institute Admin scope | memberships/{id}/impact/, transition/, replace-head/; accounts/lifecycle.py | Consequence review, reasons, replacement teacher/Head; test_staff_lifecycle.py. |
| [resources/InvitationReview.tsx](../frontend/src/features/resources/InvitationReview.tsx) | People row; authorized administrator | memberships/{id}/resend-invitation/; accounts/invitations.py + views.py; AccountInvitation | Transport/expiry state and reviewed resend; test_invitation_policy.py. |
| [resources/LinkAccount.tsx](../frontend/src/features/resources/LinkAccount.tsx) | Existing administrative identity / membership attachment | memberships/attach/; accounts/views.py; User + Membership | Link existing identity without duplicate user; LinkAccount.test.tsx. |
| [resources/ImportPeople.tsx](../frontend/src/features/resources/ImportPeople.tsx) | People import; A | memberships/import-template/, import-csv/; accounts/importing.py | Bounded CSV preview/import; test_student_import.py. |
| [resources/StudentProgression.tsx](../frontend/src/features/resources/StudentProgression.tsx) | StudentPlacement; A | memberships/{id}/progress/; academics/progression.py | Preview evidence, confirm current token/reason, save decision; test_progression.py. |
| [courses/BulkEnrollment.tsx](../frontend/src/features/courses/BulkEnrollment.tsx) | Course/offerings; A/H | offerings/{id}/enrollment-candidates/, bulk-enrollment/; academics/enrollment.py | Select up to 100 students; enroll/reactivate/withdraw with reason; test_bulk_enrollment.py. |
| [quizzes/QuizAuthoring.tsx](../frontend/src/features/quizzes/QuizAuthoring.tsx) | Quiz rows; T | quizzes/{id}/bulk-questions/, import-questions/, question-template/, add-bank-questions/, order-questions/, duplicate/ | Batch/CSV/bank/order/duplicate tools; learning/authoring.py; test_quiz_authoring.py. |
| [quizzes/BankCopy.tsx](../frontend/src/features/quizzes/BankCopy.tsx) | Question-bank row; T | question-bank/{id}/copy-to-quiz/; learning/views.py | Copy reusable question into editable assigned quiz; test_quiz_authoring.py. |
| [analytics/ClassAnalysis.tsx](../frontend/src/features/analytics/ClassAnalysis.tsx) | Predictions and course AI insights | class-analysis/ and run detail/items/advance; insights/batch.py | Bounded class progress/results; generation disabled for oversight; test_class_analysis.py / real-data-ml.spec.ts. |
| [analytics/PredictionContext.tsx](../frontend/src/features/analytics/PredictionContext.tsx) | Prediction basis/history details | Saved prediction model_info/observations; no independent API | Actual inputs/source/target/warning; PredictionContext.test.tsx. |
| [analytics/LearnerProgress.tsx](../frontend/src/features/analytics/LearnerProgress.tsx) | Course progress; staff selected learner, S self | analytics/learner-progress/; insights/learner_progress.py | Actual learning status and actionable guidance; test_learner_progress.py. |
| [analytics/StudentPriorities.tsx](../frontend/src/features/analytics/StudentPriorities.tsx) | Student dashboard | my-agenda/; insights/agenda.py | Upcoming/outstanding coursework; test_student_agenda.py. |
| [analytics/CourseComparisons.tsx](../frontend/src/features/analytics/CourseComparisons.tsx) | Trends staff report | analytics/courses/; insights/course_reports.py | Paged class comparison with real filters; test_course_comparisons.py. |
| [analytics/Workload.tsx](../frontend/src/features/analytics/Workload.tsx) | Dashboard/Trends staff views | analytics/workload/; insights/workload.py | Paged instructors and scoped counts; test_workload.py. |
| [analytics/AcademicResults.tsx](../frontend/src/features/analytics/AcademicResults.tsx) | AcademicHistory / StudentPlacement | academic-results/ or memberships/{id}/academic-results/; insights/academic_results.py | University opt-in provisional GPA/CGPA and exclusions; test_academic_results.py. |
| [analytics/AcademicDecisions.tsx](../frontend/src/features/analytics/AcademicDecisions.tsx) | AcademicHistory / StudentPlacement | academic-decisions/ or memberships/{id}/progression-history/ | Decision reason/evidence/history; academics/progression.py; test_progression.py. |
| [auth/ProfilePicture.tsx](../frontend/src/features/auth/ProfilePicture.tsx) | Profile; all authenticated roles | auth/avatar/; accounts/profile.py; User | Upload/remove normalized private image; test_profile_images.py. |
| [auth/HeadWorkspace.tsx](../frontend/src/features/auth/HeadWorkspace.tsx) | Sidebar; enabled Head | auth/select-workspace/; accounts/auth.py | Management/My Teaching switch; caches and permissions reset; test_teaching_workspace.py. |
| [courses/CourseCard.tsx](../frontend/src/features/courses/CourseCard.tsx) | Offering list | Parent-provided Offering; no independent mutation API | Visual summary/navigation/actions; role acceptance browser coverage. |

ResourcePage also contains the PeopleActions popup, delete confirmation and audit-detail dialog. These are internal components in that file, not standalone pages. ResourceForm and WorkflowDialog reuse the shared Dialog primitive. Dataset results do not appear in student learning-progress recommendations as authoritative grades.

## Shared components and utilities

| File | Responsibility / common change |
|---|---|
| [layouts/Shell.tsx](../frontend/src/components/layouts/Shell.tsx) | navItems, responsive sidebar, logout, institute selector and Head workspace host; role/type menu conditions |
| [layouts/WorkspaceRoute.tsx](../frontend/src/components/layouts/WorkspaceRoute.tsx), [lib/access.ts](../frontend/src/lib/access.ts) | Selected-institute and role/type UI gates |
| [layouts/Breadcrumbs.tsx](../frontend/src/components/layouts/Breadcrumbs.tsx) | Route-aware breadcrumb labels |
| [RelationSelect.tsx](../frontend/src/components/RelationSelect.tsx) | Searchable paginated relation choices, selected-value retention and dialog portal behavior |
| [ReportControls.tsx](../frontend/src/components/ReportControls.tsx) | ReportFilters, Pagination, reportParams; institution-specific filter controls |
| [ResourceFilters.tsx](../frontend/src/features/resources/ResourceFilters.tsx) | Per-resource filter controls and dependent selectors |
| [Avatar.tsx](../frontend/src/components/Avatar.tsx) | Authorized picture URL or initials |
| [ui/dialog.tsx](../frontend/src/components/ui/dialog.tsx), [ui/button.tsx](../frontend/src/components/ui/button.tsx) | Shared accessible modal/button primitives |
| [Feedback.tsx](../frontend/src/components/Feedback.tsx), [shared.tsx](../frontend/src/components/shared.tsx) | Loading/error/empty/page-header UI and re-exports |
| [ToastProvider.tsx](../frontend/src/components/ToastProvider.tsx) | Contextual save feedback and notifySaved event |
| [api.ts](../frontend/src/lib/api.ts) | Same-origin CSRF requests, ApiError flattening, labels and guarded allPages helper |
| [useUrlFilters.ts](../frontend/src/lib/useUrlFilters.ts) | URL-backed search/filter state and pagination reset |
| [terminology.ts](../frontend/src/lib/terminology.ts), [institution.ts](../frontend/src/lib/institution.ts) | Configured vocabulary and type defaults; not backend authorization |
| [styles.css](../frontend/src/styles.css) | Shared green/white design, responsive layouts and feature styles; some page files also contain local inline style objects |
| [utils.ts](../frontend/src/lib/utils.ts) | Class-name composition helper |
| [test-setup.ts](../frontend/src/test-setup.ts) | Testing Library DOM matchers and browser test environment setup |

Component tests: [workflows.test.tsx](../frontend/src/features/workflows.test.tsx), [completion.test.tsx](../frontend/src/features/completion.test.tsx), [architecture.test.tsx](../frontend/src/features/architecture.test.tsx), [QuizAttempt.test.tsx](../frontend/src/features/quizzes/QuizAttempt.test.tsx), [LinkAccount.test.tsx](../frontend/src/features/resources/LinkAccount.test.tsx), [PredictionContext.test.tsx](../frontend/src/features/analytics/PredictionContext.test.tsx), [api.test.ts](../frontend/src/lib/api.test.ts), [terminology.test.ts](../frontend/src/lib/terminology.test.ts), [useUrlFilters.test.tsx](../frontend/src/lib/useUrlFilters.test.tsx).

## Quick-reference table

| Page or feature | Frontend file | Route | Backend endpoint | Backend implementation |
|---|---|---|---|---|
| Role-specific overview | [Dashboard.tsx](../frontend/src/features/analytics/Dashboard.tsx) | `/` | analytics/ | [insights/views.py](../backend/apps/insights/views.py) |
| Sign in | [Login.tsx](../frontend/src/features/auth/Login.tsx) | `/login` | auth/csrf/ | [accounts/auth.py](../backend/apps/accounts/auth.py) |
| Password recovery | [Login.tsx](../frontend/src/features/auth/Login.tsx) | `/forgot-password` | auth/password-reset/ | [accounts/auth.py](../backend/apps/accounts/auth.py) |
| Reset / invitation password setup | [Login.tsx](../frontend/src/features/auth/Login.tsx) | `/reset/:uid/:token` | auth/password-confirm/ | [accounts/auth.py](../backend/apps/accounts/auth.py) |
| Platform overview | [Platform.tsx](../frontend/src/features/analytics/Platform.tsx) | `/platform` | platform/ | [insights/views.py](../backend/apps/insights/views.py) |
| Platform branding settings | [PlatformSettings.tsx](../frontend/src/features/auth/PlatformSettings.tsx) | `/platform-settings` | platform-settings/ GET/PATCH | [accounts/platform.py](../backend/apps/accounts/platform.py) |
| Institute oversight | [Platform.tsx](../frontend/src/features/analytics/Platform.tsx) | `/institutes/:id` | institutes/{id}/overview/ | [accounts/views.py](../backend/apps/accounts/views.py) |
| Terminology and academic policies | [InstituteSettings.tsx](../frontend/src/features/auth/InstituteSettings.tsx) | `/institute-settings` | institutes/{id}/ GET/PATCH | [accounts/views.py](../backend/apps/accounts/views.py) |
| Reviewed student admission | [StudentAdmission.tsx](../frontend/src/features/resources/StudentAdmission.tsx) | `/student-admission` | admissions/ | [academics/admission.py](../backend/apps/academics/admission.py) |
| Own retained academic results | [AcademicHistory.tsx](../frontend/src/features/analytics/AcademicHistory.tsx) | `/academic-history` | academic-history/ | [academics/progression.py](../backend/apps/academics/progression.py) |
| Student placement and progression | [StudentAdmission.tsx](../frontend/src/features/resources/StudentAdmission.tsx) | `/student-placement/:id` | memberships/{id}/ | [academics/admission.py](../backend/apps/academics/admission.py) |
| Correction review queue | [AcademicControl.tsx](../frontend/src/features/resources/AcademicControl.tsx) | `/academic-reviews` | corrections/ | [learning/governance.py](../backend/apps/learning/governance.py) |
| Setup readiness checklist | [InstituteSetup.tsx](../frontend/src/features/resources/InstituteSetup.tsx) | `/institute-setup` | institute-setup/ | [academics/setup.py](../backend/apps/academics/setup.py) |
| Academic structure navigation | [Academics.tsx](../frontend/src/features/resources/Academics.tsx) | `/academics` | No direct API | [accounts/institution.py](../backend/apps/accounts/institution.py) |
| Department appointments | [TeacherAppointments.tsx](../frontend/src/features/resources/TeacherAppointments.tsx) | `/teacher-appointments` | teacher-appointments/ | [accounts/appointments.py](../backend/apps/accounts/appointments.py) |
| Unified course workspace | [CourseDetail.tsx](../frontend/src/features/courses/CourseDetail.tsx) | `/course/:id` | offerings/{id}/ plus active tab APIs | [academics/views.py](../backend/apps/academics/views.py) |
| Gradebook | [Gradebook.tsx](../frontend/src/features/analytics/Gradebook.tsx) | `/grades` | grades/ | [insights/views.py](../backend/apps/insights/views.py) |
| Academic progress and reports | [Trends.tsx](../frontend/src/features/analytics/Trends.tsx) | `/analytics` | analytics/trends/ | [insights/reporting.py](../backend/apps/insights/reporting.py) |
| Experimental learning insights | [Predictions.tsx](../frontend/src/features/analytics/Predictions.tsx) | `/predictions` | model-status/ | [insights/views.py](../backend/apps/insights/views.py) |
| Profile and security | [Profile.tsx](../frontend/src/features/auth/Profile.tsx) | `/profile` | auth/me/ GET/PATCH | [accounts/auth.py](../backend/apps/accounts/auth.py) |
| Take a quiz | [QuizAttempt.tsx](../frontend/src/features/quizzes/QuizAttempt.tsx) | `/quiz-attempt/:id` | attempts/{id}/ | [learning/views.py](../backend/apps/learning/views.py) |
| Access unavailable | [main.tsx](../frontend/src/main.tsx) | `/unauthorized` | None | None |
| Platform audit | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/platform-audit` | `/api/v1/platform-audit/` | [PlatformAuditViewSet](../backend/apps/accounts/platform.py) |
| Institute Administrators & Platform Access | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/platform-users` | `/api/v1/platform-users/` | [PlatformUserViewSet](../backend/apps/accounts/platform.py) |
| Institutes | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/institutes` | `/api/v1/institutes/` | [InstituteViewSet](../backend/apps/accounts/views.py) |
| Academic units | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/units` | `/api/v1/units/` | [UnitViewSet](../backend/apps/academics/views.py) |
| Academic years | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/years` | `/api/v1/years/` | [YearViewSet](../backend/apps/academics/views.py) |
| Terms & semesters | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/terms` | `/api/v1/terms/` | [TermViewSet](../backend/apps/academics/views.py) |
| Programs & grades | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/programs` | `/api/v1/programs/` | [ProgramViewSet](../backend/apps/academics/views.py) |
| Admission batches | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/batches` | `/api/v1/batches/` | [AdmissionBatchViewSet](../backend/apps/academics/views.py) |
| Curriculum | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/curriculum` | `/api/v1/curriculum/` | [CurriculumItemViewSet](../backend/apps/academics/views.py) |
| Class sections | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/sections` | `/api/v1/sections/` | [SectionViewSet](../backend/apps/academics/views.py) |
| Course catalog | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/courses` | `/api/v1/courses/` | [CourseViewSet](../backend/apps/academics/views.py) |
| My courses | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/offerings` | `/api/v1/offerings/` | [OfferingViewSet](../backend/apps/academics/views.py) |
| People | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/memberships` | `/api/v1/memberships/` | [MembershipViewSet](../backend/apps/accounts/views.py) |
| Enrollments | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/enrollments` | `/api/v1/enrollments/` | [EnrollmentViewSet](../backend/apps/academics/views.py) |
| Learning modules | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/modules` | `/api/v1/modules/` | [ModuleViewSet](../backend/apps/learning/views.py) |
| Lessons | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/lessons` | `/api/v1/lessons/` | [LessonViewSet](../backend/apps/learning/views.py) |
| Learning materials | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/materials` | `/api/v1/materials/` | [MaterialViewSet](../backend/apps/learning/views.py) |
| Assignments | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/assignments` | `/api/v1/assignments/` | [AssignmentViewSet](../backend/apps/learning/views.py) |
| Quizzes | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/quizzes` | `/api/v1/quizzes/` | [QuizViewSet](../backend/apps/learning/views.py) |
| Quiz questions | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/questions` | `/api/v1/questions/` | [QuestionViewSet](../backend/apps/learning/views.py) |
| Manual assessment grades | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/manual-grades` | `/api/v1/manual-grades/` | [ManualGradeViewSet](../backend/apps/learning/views.py) |
| Question bank | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/question-bank` | `/api/v1/question-bank/` | [BankQuestionViewSet](../backend/apps/learning/views.py) |
| Submissions | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/submissions` | `/api/v1/submissions/` | [SubmissionViewSet](../backend/apps/learning/views.py) |
| Quiz attempts | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/attempts` | `/api/v1/attempts/` | [AttemptViewSet](../backend/apps/learning/views.py) |
| Attendance | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/attendance-sessions` | `/api/v1/attendance-sessions/` | [AttendanceSessionViewSet](../backend/apps/learning/views.py) |
| My attendance | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/attendance` | `/api/v1/attendance/` | [AttendanceViewSet](../backend/apps/learning/views.py) |
| Timetable | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/timetable` | `/api/v1/timetable/` | [TimetableViewSet](../backend/apps/academics/views.py) |
| Announcements | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/announcements` | `/api/v1/announcements/` | [AnnouncementViewSet](../backend/apps/learning/views.py) |
| Notifications | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/notifications` | `/api/v1/notifications/` | [NotificationViewSet](../backend/apps/learning/views.py) |
| Audit history | [ResourcePage.tsx](../frontend/src/features/resources/ResourcePage.tsx) + [config.ts](../frontend/src/features/resources/config.ts) | `/audit` | `/api/v1/audit/` | [AuditViewSet](../backend/apps/insights/views.py) |
