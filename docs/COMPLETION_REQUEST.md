# INTELLILMS — FINAL COMPLETION, ROLE GOVERNANCE, PREMIUM UI & SYSTEM-WIDE ACCEPTANCE MASTER PROMPT

## YOUR MISSION

You are continuing development of IntelliLMS, a generic, AI-assisted, multi-institution Learning Management System built with Django, Django REST Framework, React, TypeScript, and PostgreSQL.

**Project directory:**
`C:\Users\Luveabid\Documents\New project`

Your mission is to inspect the current repository, identify all remaining incomplete requirements, implement them, fix regressions, and move IntelliLMS toward a fully working, demonstrable final-year project.

This is a CONTINUATION of previous development, not a fresh implementation.

Do not restart, rebuild, or replace the existing system.

Do not stop after completing one feature. Continue autonomously through unfinished requirements until the task is complete or an actual execution limit prevents further work.

## 1. MANDATORY INITIAL RECONCILIATION

Before changing code:

1. Read `AGENTS.md`.
2. Read `IMPLEMENTATION_PROGRESS.md`.
3. Read `README.md`.
4. Read `docs/limitations.md`.
5. Read `docs/stability-20261014.md`, if present.
6. Inspect Git status and the current diff.
7. Review existing migrations, test suites, backend permissions, frontend routes, and relevant documentation.
8. Locate the original IntelliLMS master implementation requirements if available in the workspace.
9. Compare the current implementation against the requirements in this prompt.

The last reported stability checkpoint was:

- 136 PostgreSQL tests passed.
- 45 frontend tests passed.
- 35 browser workflows passed.
- TypeScript checks passed.
- Production build passed.
- Django checks passed.
- Migration checks passed.
- OpenAPI validation passed.

Treat these as historical results, not proof that the current repository still passes.

Do not assume any feature is missing merely because an earlier report listed it as incomplete. Inspect the current implementation first.

Preserve all existing work and concurrent changes.

## 2. PROJECT IDENTITY

IntelliLMS is a GENERIC, institution-agnostic Learning Management System.

It must support:

- Universities
- Colleges
- Schools
- Training institutes
- Other educational organizations

Never hardcode one university's academic hierarchy, terminology, or workflow.

Keep academic structures flexible and understandable.

The application must be practical for large institutions with many students, teachers, courses, and departments.

Use scalable queries, pagination, filtering, and aggregated statistics.

Avoid unnecessary decorative dashboard sections and giant unpaginated student lists.

## 3. STRICT ROLE GOVERNANCE

Preserve the existing five-role architecture:

1. Super Admin
2. Institute Admin
3. Department Head
4. Teacher
5. Student

### Super Admin

Super Admin is responsible for platform-level administration.

Allow:

- Institute administration.
- Platform oversight.
- Administrative account management.
- Relevant system operational information.

Do not expose routine student or teacher academic management through Super Admin.

Do not give Super Admin unrestricted academic APIs simply because the account is privileged.

### Institute Admin

Institute Admin manages institutional administration.

Responsibilities include:

- Institute configuration.
- Department and academic structure creation.
- Teacher account provisioning and departmental eligibility.
- Student admissions and enrollment.
- Academic policies.
- Marks and attendance oversight.
- Correction governance.
- Staff lifecycle operations.
- Institutional reporting.

Institute Admin must not automatically gain ordinary teacher grading permissions.

Exceptional overrides must be explicit, authorized, justified, and audited.

### Department Head

Department Heads manage their authorized departments.

Responsibilities include:

- Departmental teacher appointments.
- Course-teacher assignments.
- Departmental academic oversight.
- Departmental reporting.
- Correction approvals within their own department.

IMPORTANT FINAL DECISION:

Every Department Head can review grade and attendance correction requests within their own department.

Course-level delegation is NOT required for departmental correction review.

However:

- Cross-department approval is forbidden.
- Cross-institute approval is forbidden.
- Self-approval is forbidden.
- Audit history must be preserved.
- Backend permissions must enforce all restrictions.

### Teacher

Teachers may manage only their authorized teaching assignments.

Allow:

- Assigned course workspace.
- Attendance recording.
- Assignments.
- Quizzes.
- Question banks.
- Authorized grading.
- Course-level student progress.
- Relevant course reports.

Prevent unauthorized access to unrelated courses.

### Student

Students may access their own:

- Enrollments.
- Courses.
- Learning materials.
- Assignments and submissions.
- Quizzes.
- Released grades.
- Attendance.
- Progress and recommendations.
- Notifications.

Never expose another student's private academic data.

## 4. TEACHING–HEAD WORKSPACE SEPARATION

This is one of the highest-priority remaining requirements.

A Department Head may also be an authorized teacher.

The interface must clearly distinguish:

A. Department management responsibilities.

B. Actual teaching responsibilities.

Do not automatically treat all courses within the Head's department as their personal teaching assignments.

Department oversight must not grant unrestricted teaching, grading, attendance-editing, or quiz-release permissions.

Where a Head is explicitly appointed to teach, provide the appropriate teaching workspace.

Preserve the existing role architecture rather than introducing unnecessary new account types.

Ensure navigation, permissions, and API responses remain consistent.

Add tests covering:

- Head with no teaching assignment.
- Head with authorized teaching assignment.
- Head overseeing another teacher's course.
- Head assigned to multiple departments.
- Revoked teaching appointment.
- Cross-department access.
- Cross-institute access.

## 5. COMPLETE ACADEMIC POLICY MANAGEMENT

Inspect the existing policy system before extending it.

Verify or finish:

- Configurable grading weights.
- Assessment policies.
- Grade release and finalization rules.
- Attendance policies.
- Correction request procedures.
- Independent approval.
- Audited emergency overrides.
- Academic history preservation.
- Policy validation.
- Appropriate institutional and departmental scope.

Do not allow ordinary serializer writes to bypass finalization or governance rules.

Do not permit administrators or unassigned Heads to enter manual marks without explicit authorization.

Do not permit unauthorized quiz-grade release.

Do not change historical results silently.

Implement only policy capabilities supported by the existing domain model or clearly required by the project; avoid unnecessary new subsystems.

## 6. ACADEMIC STRUCTURE AND COURSE WORKFLOWS

Maintain a simple, flexible academic structure.

Authorized users should be able to:

- Create departments.
- Create academic programs or equivalent structures.
- Create subjects.
- Create courses or offerings.
- Configure terms or academic periods.
- Configure sections where appropriate.
- Assign eligible teachers.
- Enroll eligible students.

Avoid forcing users to visit several unrelated pages merely to create a course.

Allow safe inline creation of missing related records when appropriate.

Prevent duplicates and preserve referential integrity.

Do not hardcode university-only terminology.

## 7. STAFF AND STUDENT LIFECYCLE

Audit and finish all lifecycle operations.

Staff:

- Creation.
- Eligibility.
- Departmental appointment.
- Teaching assignment.
- Role or appointment changes.
- Deactivation.
- Removal.
- Course reassignment.
- Access revocation.
- Audit history.

Students:

- Creation.
- Admission.
- Enrollment.
- Bulk enrollment.
- CSV import.
- Transfers.
- Deactivation.
- Archive and history access.

Require clear consequence-review dialogs for destructive or consequential operations.

Never silently destroy academic history.

Prevent duplicate enrollment and unauthorized cross-institute changes.

Preserve existing database records.

## 8. UNIFIED TEACHER COURSE WORKSPACE

Verify the existing course workspace.

A teacher should be able to manage a course through one intuitive interface.

Include appropriately organized access to:

- Course overview.
- Roster.
- Attendance.
- Learning materials.
- Assignments.
- Quizzes.
- Question bank.
- Gradebook.
- Course analytics.

Keep navigation simple and avoid unnecessary clicks.

Preserve existing working features.

## 9. QUIZZES, ASSIGNMENTS AND GRADEBOOK

Verify:

- Question-bank management.
- Bulk question creation.
- CSV question import.
- Draft question duplication.
- Question reordering.
- Quiz publication.
- Attempt restrictions.
- Submission handling.
- Authorized grading.
- Fractional grades.
- Weighted calculations.
- Grade finalization.
- Grade release.
- Gradebook export.
- Correction workflow.

Add focused regression tests for missing edge cases.

Do not weaken authorization merely to satisfy outdated tests.

## 10. REPORTING AND ANALYTICS

This is a major remaining priority.

Finish and verify role-specific reports.

Institute Admin:

- Institution-wide academic overview.
- Department-level performance.
- Attendance summaries.
- Course performance.
- Enrollment statistics.
- Academic trends.
- Relevant administrative reports.

Department Head:

- Department performance.
- Course comparisons.
- Teacher assignment coverage.
- Attendance trends.
- Grade distributions.
- Students requiring attention, within authorized scope.

Teacher:

- Assigned-class performance.
- Assessment statistics.
- Attendance summaries.
- Grade distributions.
- Recorded academic progress.
- Appropriate experimental insights.

Student:

- Personal academic progress.
- Released grades.
- Attendance.
- Upcoming and missed deadlines.
- Actionable study recommendations.

Use scalable aggregation and pagination.

Avoid loading thousands of individual student records merely to render an overview.

Use the existing charting approach and avoid introducing unnecessary visualization dependencies.

## 11. EXPERIMENTAL MACHINE LEARNING

Preserve the existing experimental ML architecture.

The project has not established real-world student-data validation.

Never claim production-ready prediction accuracy.

Never fabricate:

- Model accuracy.
- Real-world validation.
- Student outcome improvements.
- Deployment results.

Verify existing class analysis features:

- Bounded processing.
- Resumable jobs.
- Pause/resume.
- Duplicate-run protection.
- Per-student failure handling.
- Saved progress.
- Authorization.
- Searchable and paginated results.

Separate recorded academic facts from experimental model estimates.

Keep experimental estimates clearly labeled.

Student-facing recommendations should prioritize actual recorded performance and released academic results.

Do not expose unsupported or misleading risk classifications to students.

Document the limitations accurately.

## 12. NOTIFICATIONS AND PERSONALIZATION

Audit:

- Assignment notifications.
- Quiz notifications.
- Enrollment updates.
- Teaching appointments.
- Grade release.
- Correction outcomes.
- Academic reminders.
- Relevant administrative events.

Verify:

- Private destinations.
- Correct recipient scope.
- Notification preferences.
- Read/unread behavior.
- Safe navigation.
- No disclosure of private administrative reasons.

Preserve private profile-image handling, validation, and metadata removal.

## 13. PREMIUM INTELLILMS UI/UX

Improve the existing design without replacing its identity.

Maintain green-and-white IntelliLMS branding.

Create a premium, modern, professional interface with:

- Better visual hierarchy.
- Thoughtful accent colors.
- Attractive but practical dashboards.
- Consistent spacing.
- Clear typography.
- Better tables.
- Useful filtering.
- Consistent dialogs.
- Clear empty states.
- Responsive layouts.
- Accessible controls.
- Professional loading and error states.

Avoid:

- Excessive decorative cards.
- Redundant dashboard sections.
- Huge student lists.
- Deeply nested workflows.
- Unnecessary animations.
- Low-contrast text.
- Clipped dropdowns.
- Broken mobile dialogs.

Design for real educational administrators, teachers, and students.

Preserve existing working frontend components.

Respect any protected-file or concurrent-edit restrictions documented in the repository.

## 14. AUTHENTICATION AND SECURITY

Complete verification of:

- Login.
- Logout.
- Password reset.
- Account invitations.
- Invitation expiry.
- Replay protection.
- Account linking.
- Session handling.
- CSRF protection.
- Role authorization.
- Institute selection.
- Object-level permissions.
- Cross-institute isolation.
- File upload security.
- Private student data.
- Audit trails.

Never rely on frontend visibility as the only security boundary.

## 15. PERFORMANCE AND SCALABILITY

Verify the system under realistic large-institution workloads.

Inspect:

- Database query counts.
- N+1 queries.
- Pagination.
- Filtering.
- Indexes.
- Large course rosters.
- Bulk enrollment.
- Report generation.
- Class analysis.
- Frontend bundle size.

Use isolated test data for performance tests.

Do not alter production-like or recovered academic data.

## 16. DATABASE PRESERVATION — CRITICAL

The existing recovered PostgreSQL database has previously been identified as:

`intellilms_recovered_20261012`

Verify the actual current configuration before making any database changes.

Do not assume this database name is still current.

NEVER:

- Drop the existing database.
- Reset application data.
- Delete existing Docker volumes.
- Replace real records with fixtures.
- Destroy historical academic data.
- Run destructive cleanup against the recovered database.

Use isolated test databases.

Use safe additive migrations when possible.

Before any consequential migration, verify database identity and backup/recovery safety.

## 17. AUTOMATED TESTING

Run relevant checks throughout implementation.

Backend:

- Django system checks.
- PostgreSQL tests.
- Migration consistency.
- Permission tests.
- API schema validation.

Frontend:

- TypeScript typecheck.
- Component tests.
- Production build.
- Browser workflows.
- Desktop and mobile interaction tests.

Acceptance tests must cover the complete institute-to-student lifecycle.

Verify all five roles.

Do not change valid business rules merely to make tests pass.

Update stale tests only when the intended requirements genuinely changed.

Report actual pass/fail results.

## 18. FINAL DOCUMENTATION

Update:

- IMPLEMENTATION_PROGRESS.md
- README.md
- docs/limitations.md
- Relevant implementation and testing documentation.

Create or update a requirement-by-requirement acceptance matrix.

For every requirement record:

- Implemented.
- Partially implemented.
- Missing.
- Blocked.
- Verified by test.
- Relevant test or code location.

Do not invent completion percentages.

Calculate completion only from the audited requirement matrix.

Keep the SRS and final-year project documentation consistent with actual implemented functionality.

Document synthetic ML limitations honestly.

## 19. CONTINUOUS EXECUTION RULES

IMPORTANT:

This is one continuous implementation task.

Do not stop after an initial audit.

Do not spend the entire session planning.

Do not request approval between ordinary independent features.

Do not unnecessarily rewrite completed functionality.

Prioritize:

1. Teaching–Head separation.
2. Academic governance.
3. Remaining academic workflow defects.
4. Reporting completeness.
5. Student experience.
6. Premium UI improvements.
7. Security, scalability, and complete acceptance tests.
8. Documentation and final verification.

You may reorder independent tasks if technically necessary.

If another developer or ChatGPT session is editing a file:

- Detect concurrent changes.
- Preserve their work.
- Avoid conflicting edits.
- Continue with independent tasks.
- Never blindly overwrite their changes.

If the task is interrupted by usage or context limits:

- Save valid progress.
- Record changed files.
- Record tests and results.
- Record unresolved failures.
- Identify the exact next action.
- Update IMPLEMENTATION_PROGRESS.md.

## 20. COMPLETION CRITERIA

Do not declare IntelliLMS complete until:

- All required features are implemented or explicitly documented as limitations.
- All five roles have correct permissions and navigation.
- Department and institute isolation is enforced.
- Teaching–Head separation is correct.
- Academic policies work.
- Student and staff lifecycle workflows work.
- Reporting is complete to the agreed scope.
- Experimental ML is appropriately labeled.
- UI is consistent and responsive.
- Database records remain intact.
- Relevant backend and frontend tests pass.
- Complete browser acceptance workflows pass.
- Documentation matches implementation.

Report remaining limitations honestly.

## FINAL INSTRUCTION

RESUME FROM THE CURRENT REPOSITORY STATE.

START WITH THE HIGHEST-PRIORITY UNFINISHED REQUIREMENT.

IMPLEMENT REAL WORKING CODE.

RUN TESTS.

FIX REGRESSIONS.

CONTINUE TO THE NEXT UNFINISHED REQUIREMENT.

DO NOT STOP AFTER ONE FEATURE.

DO NOT DECLARE COMPLETION PREMATURELY.

START NOW.
