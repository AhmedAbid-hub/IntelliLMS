# INTELLILMS — COMPLETE UNIFIED ACADEMIC ARCHITECTURE, INSTITUTION ADAPTATION, SECURITY, WORKFLOW & SYSTEM STABILIZATION

You are the principal software architect, senior Django engineer, frontend engineer, PostgreSQL database architect, security engineer, and QA engineer responsible for completing and stabilizing the existing IntelliLMS project.

**YOUR MISSION: Inspect, correct, implement, integrate, and test ALL requirements in this prompt as ONE continuous engineering assignment.**

Do not divide the work into phases, request approval between tasks, or stop after producing an analysis or implementation plan.

Work directly in the existing repository. Investigate dependencies, make changes, run tests, fix failures, and continue to the next outstanding requirement.

If the task exceeds your context or execution limits, preserve your progress and outstanding work so the next instruction, **"Continue"**, resumes the same assignment without repeating completed work.

## NON-NEGOTIABLE ENGINEERING RULES

- IntelliLMS is a generic, institution-agnostic Learning Management System, not a university-only application.
- Preserve all working functionality and previously implemented business rules.
- Never rewrite the project unnecessarily.
- Never delete or reset production or development data to solve an implementation problem.
- Never delete existing migrations or recreate the database to avoid migration conflicts.
- Preserve PostgreSQL compatibility and the existing Docker configuration.
- Reuse existing models, serializers, services, permission classes, API endpoints, and frontend components where appropriate.
- Make additive, backward-compatible database changes wherever possible.
- Do not silently alter the academic type of an existing institute.
- Do not weaken authentication, authorization, tenant isolation, or audit logging.
- Do not remove existing tests merely because they fail.
- Do not claim tests passed unless they actually ran successfully.
- Do not replace real functionality with mock data, placeholder dashboards, fake API responses, or fabricated AI predictions.
- Maintain a simple, modern, intuitive interface with minimal unnecessary navigation.
- Prefer shared architecture over duplicating entire applications for different institute types.
- Avoid unnecessary dependencies, infrastructure, or complexity.
- Do not overwrite unrelated concurrent changes made by another developer or agent.
- Respect existing project conventions and coding style.
- Keep the application operational throughout implementation wherever practical.

## COMPLETE INSTITUTION-TYPE SYSTEM

When Super Admin creates an institute, the system must require the institute type:

1. School
2. College
3. University

The selected type must determine academic configuration, available modules, workflows, terminology, dashboards, navigation, validation, and backend permissions.

Inspect the current Institute model and creation workflow first. Reuse existing fields where possible.

### SCHOOL

School academic structure:

Institute → Academic Year → Class/Grade → Section → Subjects → Teachers/Students

Schools must support:

- Classes and grades.
- Sections.
- Academic years.
- Subject management.
- Teacher assignments.
- Student admissions.
- Student class placement.
- Attendance.
- Assessments.
- Results.
- Promotion and repetition.
- Historical academic records.
- School-specific reporting and analytics.

Schools must not expose department management, Department Head roles, university semesters, or unnecessary program/batch workflows.

School administrators must be able to manage subjects and assign teachers directly through appropriately authorized workflows.

### COLLEGE

Default college structure:

Institute → Department → Program → Academic Year → Study Year → Section → Courses

Colleges must support:

- Departments.
- Department Heads.
- Programs.
- First Year and Second Year.
- Configurable program duration.
- Sections.
- Students and teachers.
- Course management.
- Teacher appointments.
- Attendance.
- Assessments.
- Annual results.
- Student progression.
- Academic reporting.
- Historical records.

The initial college configuration must use an annual study-year system, not university-style semesters.

Avoid hardcoding all colleges worldwide to two-year programs. Preserve the requested two-year default while keeping program duration configurable.

### UNIVERSITY

University structure:

Institute → Department → Program → Batch/Cohort → Academic Year → Semester → Section/Course Offering

Universities must support:

- Departments.
- Department Heads.
- Programs.
- Configurable program duration.
- Batches/cohorts.
- Semesters.
- Sections.
- Course offerings.
- Teacher assignments.
- Student course enrollment.
- Attendance.
- Assessments.
- Semester results.
- GPA/CGPA where supported by configured grading policies.
- Academic progression.
- Failed and repeated courses.
- Historical academic records.
- Academic reporting and analytics.

Do not assume every university program has exactly eight semesters.

### BACKEND ENFORCEMENT

Institute-type restrictions must be enforced server-side.

Prevent invalid academic structures, cross-institute relationships, unauthorized assignments, invalid progression, and incompatible academic-period records.

Do not rely on hidden frontend buttons for security.

Implement centralized, reusable institution-aware business rules rather than scattering inconsistent checks across views.

Design underlying academic-period relationships to support future flexibility without introducing an unnecessarily complex configuration interface.

## ADAPTIVE DASHBOARDS AND WORKSPACES

Implement genuinely institution-aware dashboards for Institute Admin, Teacher, Student, and Department Head where applicable.

School Institute Admin should see classes, sections, subjects, students, teachers, attendance, assessments, and school performance.

College Institute Admin should see departments, programs, study years, sections, teachers, students, courses, results, and analytics.

University Institute Admin should see departments, programs, batches, semesters, course offerings, teachers, students, academic results, and analytics.

Teacher and Student dashboards must use terminology and workflows appropriate to their institute.

Department Head workspaces must only be available where departments exist.

Super Admin must preserve the existing administrative-account management restrictions. Do not expose ordinary student and teacher management contrary to previously established rules.

Use efficient backend aggregate queries for dashboard statistics.

Do not load entire student lists just to calculate counts.

Avoid decorative, redundant, or confusing dashboard sections.

## COMPLETE STUDENT ACADEMIC LIFECYCLE

Audit and complete student admission, enrollment, placement, progression, repetition, withdrawal, completion, and graduation.

School progression must support movement between classes.

College progression must support movement between study years.

University progression must support movement between semesters, including failed or repeated courses.

Do not implement progression by simply overwriting the student's current class, study year, or semester.

Preserve historical enrollment, attendance, grades, course offerings, teacher assignments, and academic results.

Support authorized correction of placement mistakes without corrupting historical records.

Prevent duplicate and conflicting active enrollments.

Ensure progression decisions use appropriate academic rules and authorized administrative actions.

## ACADEMIC YEAR AND PERIOD MANAGEMENT

Audit academic-year, semester, and study-year handling.

Ensure:

- Academic periods belong to the correct institute.
- Only compatible periods can be created.
- Active periods are identified correctly.
- Historical periods remain accessible.
- Finalized records receive appropriate protection.
- Opening and closing periods does not corrupt enrollment or reporting.
- Courses and assessments remain associated with their original academic periods.

Reuse existing audited correction mechanisms.

## DEPARTMENT MANAGEMENT AND PERMISSIONS

Preserve and strengthen the existing department system.

Institute Admin must manage departments and authorize eligible teacher departments.

Department Heads must operate only within their authorized departments.

Teacher appointments and course assignments must follow the existing departmental authorization workflow.

For correction approvals, preserve the existing explicit course-level delegation requirement.

**A Department Head must NOT automatically gain permission to approve every attendance or grade correction merely because the course belongs to their department.**

Maintain separation between department management, teaching assignments, correction approvals, and institute administration.

School institutes must use an appropriate direct teacher assignment workflow without artificial departments.

## COURSE AND SUBJECT LIFECYCLE

Audit the complete course and subject system.

Ensure:

- Subjects can be created easily.
- Authorized users can create missing related records inline where appropriate.
- Courses are linked to valid programs, academic periods, and institutes.
- Course offerings have correct teacher assignments.
- Students enroll only in eligible offerings.
- Historical course offerings remain accurate.
- Duplicate or conflicting course assignments are prevented.
- Changes to current offerings do not corrupt past academic records.
- Teachers access only assigned academic resources.
- Students access only their own authorized courses and records.

Keep workflows low-click and intuitive.

Do not force school administrators through university-style academic catalog management.

## ATTENDANCE SYSTEM

Audit and stabilize:

- Attendance session creation.
- Student roster selection.
- Attendance recording.
- Duplicate prevention.
- Teacher permissions.
- Attendance editing windows.
- Released or finalized record protection.
- Correction requests.
- Authorized approvals.
- Audit history.
- Academic-period relationships.
- Reporting accuracy.
- Bulk attendance operations.

Ensure institution-type adaptation without duplicating attendance logic.

## ASSESSMENT AND GRADING SYSTEM

Audit and stabilize:

- Assessment creation.
- Assessment categories.
- Grade entry.
- Enrollment validation.
- Grade release.
- Editing restrictions.
- Correction requests.
- Approval delegation.
- Audit trails.
- Student result visibility.
- Final result calculations.
- Historical results.

Use configured grading policies.

Do not invent a universal GPA formula or grading scale.

School, college, and university result interfaces must match their respective academic structures.

## REPORTING AND ANALYTICS

Implement institution-aware reporting filters.

School:

Academic Year, Class, Section, Subject.

College:

Academic Year, Department, Program, Study Year, Section, Course.

University:

Academic Year, Department, Program, Batch, Semester, Section, Course Offering.

Verify:

- Correct aggregation.
- Accurate enrollment counts.
- Correct attendance percentages.
- Correct assessment statistics.
- No duplicate records caused by joins.
- Pagination.
- Filtering.
- Sorting.
- Efficient database queries.
- Cross-institute isolation.
- Links to relevant course workspaces.

Preserve and complete existing course-comparison reporting.

## SECURITY AND MULTI-TENANCY

Conduct a thorough security audit of all relevant APIs and workflows.

Verify:

- Institute isolation.
- Active membership validation.
- Role-based access control.
- Department scoping.
- Course-level authorization.
- Teacher appointment authorization.
- Student self-access.
- Institute switching.
- Correction approval restrictions.
- Administrative-account visibility.
- Cross-institute foreign-key validation.
- Unauthorized record modification.
- Permission revocation.
- Session and authentication handling.

Test direct unauthorized API requests.

A user must never access another institute's information by changing request parameters or object identifiers.

Do not broaden permissions simply to make tests pass.

## ACCOUNT AND MEMBERSHIP LIFECYCLE

Audit account creation, activation, invitations, membership assignment, department authorization, role changes, and deactivation.

Ensure:

- Existing users are handled correctly.
- Duplicate accounts and memberships are prevented.
- Membership changes do not silently grant unauthorized permissions.
- Revoked assignments stop granting access.
- Historical academic records remain intact after teacher or student deactivation.
- Super Admin and Institute Admin responsibilities remain separated.
- Department Head appointments and removals behave correctly.

## AI PERFORMANCE ANALYTICS

Audit the existing AI and ML components.

Verify feature preparation, academic-history handling, model training, inference, persistence, missing-data handling, access permissions, and dashboard integration.

Do not fabricate predictions or accuracy.

Do not describe an unvalidated model as production-ready.

Where predictions cannot be produced reliably, display an appropriate unavailable or insufficient-data state.

Preserve the ability to use historical academic information for future model development while enforcing institute isolation.

Avoid unnecessary cloud infrastructure.

## SCALABILITY AND PERFORMANCE

IntelliLMS must support both small schools and large universities.

Audit:

- Database indexes.
- Query efficiency.
- N+1 queries.
- Large roster handling.
- Pagination.
- Bulk student operations.
- Bulk teacher assignments.
- Attendance recording performance.
- Report aggregation.
- Concurrent updates.
- Transaction safety.
- Data integrity constraints.

Optimize demonstrated bottlenecks without prematurely introducing complex infrastructure.

## FRONTEND QUALITY

Inspect every relevant frontend route and form.

Ensure:

- Navigation adapts to institute type.
- Role-based menus are accurate.
- Invalid controls are hidden.
- Direct unauthorized navigation is handled safely.
- Dropdowns load correct options.
- Filters work correctly.
- Empty states are meaningful.
- Loading and error states are clear.
- Forms validate correctly.
- Tables are usable with large datasets.
- Layouts remain responsive.
- Accessibility is preserved.
- Existing design consistency is maintained.

Do not remove working features or simplify interfaces by deleting necessary functionality.

## DATABASE AND MIGRATION SAFETY

Inspect all existing models and migrations before making changes.

Preserve existing primary keys, foreign keys, memberships, enrollments, grades, attendance, and audit records.

Use safe additive migrations where possible.

Handle existing institutes and legacy academic records explicitly.

Never silently infer an institute type when the existing data is ambiguous.

Do not delete data to satisfy new constraints.

Verify migrations against the existing PostgreSQL environment.

If database services are temporarily unavailable, diagnose the environment rather than changing application logic to bypass PostgreSQL.

SQLite smoke tests may supplement testing but must not be represented as PostgreSQL verification.

## END-TO-END ACCEPTANCE TESTING

Build automated tests for complete real-world workflows.

**School scenario:**

Create school → configure academic year → create class → create section → create subjects → assign teachers → admit students → record attendance → create assessments → publish results → promote students.

**College scenario:**

Create college → create department → appoint Department Head → create program → configure First Year and Second Year → create sections and courses → assign teachers → enroll students → record attendance → publish results → progress students.

**University scenario:**

Create university → create department → appoint Department Head → create program → configure batch and semesters → create course offerings → assign teachers → enroll students → record attendance → create assessments → publish results → progress students to the next semester.

Test valid and invalid actions.

Test cross-institute access denial.

Test department and course-level permissions.

Test historical record preservation.

Test direct API authorization.

Test frontend workflows where browser testing is available.

Run focused tests after meaningful changes and the full relevant test suite before claiming completion.

## CONTINUOUS EXECUTION RULES

This is ONE unified implementation assignment, not a sequence of separate tasks requiring approval.

You must:

1. Inspect the actual repository and identify the current implementation.
2. Maintain a working checklist of all requirements and discovered defects.
3. Implement fixes continuously according to dependencies and risk.
4. Run appropriate tests while working.
5. Fix regressions introduced by your changes.
6. Continue automatically to the next outstanding requirement.
7. Avoid asking for permission between ordinary implementation tasks.
8. Preserve existing functionality and security.
9. Do not repeatedly audit already verified areas unless new changes affect them.
10. Do not declare the project complete while known in-scope work remains unfinished.

When you encounter a context or execution limit, record a durable checkpoint in the repository, preferably in a clearly named progress document.

The checkpoint must contain:

- Completed changes.
- Modified files.
- Remaining requirements.
- Known defects.
- Tests executed and results.
- Unverified assumptions.
- Migration status.
- Immediate next implementation action.

Do not mark work complete based only on code being written. Distinguish implemented, tested, partially verified, and blocked items.

Do not create unnecessary documentation files or repeated status reports.

## WHEN I SAY "CONTINUE"

Treat the word **Continue** as:

"Resume the entire IntelliLMS unified architecture and stabilization assignment from the latest verified checkpoint. Inspect the current repository state, preserve completed work, avoid duplicate changes, implement the next outstanding requirements, run appropriate tests, and keep progressing autonomously. Do not restart the audit or ask which task to perform next."

Do not ask me to select the next module.

Do not stop after one small fix if additional work can be completed.

Continue until the entire assignment is implemented and verified, or until a genuine blocker requires information or action that cannot be obtained safely.

## FINAL COMPLETION CRITERIA

The assignment is complete only when:

- School, college, and university institute types work correctly.
- Their academic structures are enforced in the backend.
- Their dashboards and navigation adapt correctly.
- Department management works for college and university.
- School workflows do not require departments.
- University semester management works correctly.
- College study-year management works correctly.
- Student admission and academic progression work.
- Course and teacher assignment workflows are correct.
- Attendance, assessments, results, and corrections work.
- Existing permission rules remain intact.
- Multi-institute isolation is verified.
- Reporting and analytics use the correct academic structures.
- AI functionality represents its actual validation state accurately.
- Database migrations preserve existing data.
- Relevant automated tests pass.
- End-to-end academic workflows are verified.
- No known critical in-scope defects remain.

If anything remains unverified or blocked, state it explicitly rather than claiming completion.

**START NOW. Inspect the existing IntelliLMS repository and immediately begin implementing and validating the complete unified assignment. Continue working autonomously across all affected backend and frontend modules.**