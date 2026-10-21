# INTELLILMS — COMPLETE CODEBASE REORGANIZATION, SIMPLIFICATION, DATABASE VISIBILITY & DOCUMENTATION

## YOUR ROLE

You are a senior full-stack software architect, React/TypeScript engineer, Django REST Framework developer, PostgreSQL database engineer, and software refactoring specialist.

You are working directly inside my existing **IntelliLMS (Intelligent Learning Management System)** repository.

Your assignment is to **fully clean up, reorganize, simplify, standardize, and document the entire existing project in one continuous execution**.

Do not stop after planning. Do not ask for approval between individual refactoring tasks. Inspect the repository, establish a safe baseline, make the improvements, run tests, resolve regressions, update documentation, and continue until the task is complete.

If you reach a context, time, or execution limit, write a detailed checkpoint describing what has been completed and what remains. When I say **"Continue"**, resume from that checkpoint without repeating completed work.

**THIS IS A REFACTORING TASK, NOT A REWRITE OR REDESIGN.**

The project already contains extensive functionality. Your primary responsibility is to preserve it while making the codebase much easier to understand.

---

# 1. MAIN OBJECTIVE

Our IntelliLMS project has become unnecessarily difficult to navigate.

The major problems are:

- Frontend page names do not consistently match their filenames.
- Some pages are generated through generic resource components, making their implementation difficult to locate.
- Large files contain too many responsibilities.
- Backend files have unclear or overly generic names.
- Business logic is scattered across different modules.
- Role permissions are difficult to trace.
- School, college, and university rules are mixed into unrelated components.
- Database tables and relationships are difficult to understand.
- It is unclear which backend function controls which frontend action.
- Documentation does not clearly explain where to make changes.
- The project is difficult for a student developer to learn, maintain, and defend during a university viva.

Your job is to fix these problems comprehensively.

After your work, developers should be able to find any feature by its name, understand how it works, identify its API endpoints and database models, and modify it without searching through unrelated files.

**Do not sacrifice functionality for simplicity.**

---

# 2. NON-NEGOTIABLE RULES

Preserve all existing functionality, appearance, data, APIs, and permissions.

Do not:

- Rewrite the application from scratch.
- Change the existing technology stack.
- Replace PostgreSQL.
- Redesign the frontend.
- Change colors, typography, spacing, cards, tables, modals, navigation, or page layouts.
- Remove any working feature.
- Change existing API URLs or response contracts.
- Delete or reset database tables.
- Delete Docker volumes.
- Reset migrations.
- Delete or modify existing student records, grades, or attendance unnecessarily.
- Change school, college, or university academic rules.
- Expand any user's permissions.
- Weaken tenant isolation.
- Remove analytics or ML functionality.
- Replace working functionality with mock data.
- Introduce unnecessary dependencies.
- Make destructive changes to local or remote data.
- Silently discard uncommitted changes.

Do not rename existing database tables or fields merely to make their names prettier. Explain confusing names through documentation and developer-facing aliases where appropriate.

Do not rename public API fields unless compatibility is fully preserved.

Before editing, inspect Git status. Preserve existing uncommitted work and establish a safe recovery point. Use a dedicated refactoring branch where possible.

You may reorganize source files, imports, internal functions, components, and private modules when it is safe to do so.

Keep existing behavior identical.

---

# 3. WORK AUTONOMOUSLY UNTIL COMPLETE

Do not stop after creating an audit or plan.

Perform the full job:

1. Inspect the existing repository.
2. Understand the frontend, backend, database, and permissions.
3. Identify confusing files and structural problems.
4. Determine the safest improved architecture.
5. Reorganize the frontend.
6. Reorganize the backend.
7. Improve naming and readability.
8. Centralize appropriate shared rules.
9. Improve database discoverability.
10. Create comprehensive documentation.
11. Update imports and references.
12. Run tests.
13. Fix regressions.
14. Verify that the UI and behavior remain unchanged.
15. Provide a final summary.

These are responsibilities, not separate approval phases. Work continuously.

Make incremental, reviewable changes internally rather than performing one uncontrolled rewrite.

If a change would require destructive database operations, breaking an external API, or discarding user changes, skip that change and document the blocker instead of requesting broad permission.

---

# 4. COMPLETE FRONTEND CLEANUP

Inspect the actual React router, page components, shared components, hooks, API clients, and styling.

The frontend should use a clear, predictable structure.

Each major page must have a recognizable entry component whose name matches its purpose.

Examples:

- `PlatformDashboard.tsx`
- `InstituteAdminDashboard.tsx`
- `DepartmentHeadDashboard.tsx`
- `TeacherDashboard.tsx`
- `StudentDashboard.tsx`
- `ManageInstitutes.tsx`
- `ManageDepartments.tsx`
- `ManagePrograms.tsx`
- `ManageStudents.tsx`
- `StudentAdmission.tsx`
- `StudentPlacement.tsx`
- `TeacherAppointments.tsx`
- `CourseOfferings.tsx`
- `CourseWorkspace.tsx`
- `AttendanceManagement.tsx`
- `Gradebook.tsx`
- `GradeCorrections.tsx`
- `AnalyticsDashboard.tsx`
- `Predictions.tsx`

These are examples. Verify the real pages before naming them.

## Target organization

Use a sensible feature-based structure similar to:

```text
frontend/src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers/
│
├── pages/
│   ├── authentication/
│   ├── platform/
│   ├── institute/
│   ├── department/
│   ├── teacher/
│   ├── student/
│   ├── academics/
│   ├── learning/
│   ├── assessments/
│   ├── analytics/
│   └── settings/
│
├── components/
│   ├── layout/
│   ├── navigation/
│   ├── forms/
│   ├── tables/
│   ├── dialogs/
│   ├── cards/
│   └── common/
│
├── hooks/
├── services/
├── permissions/
├── policies/
├── types/
├── utils/
└── styles/
```

Adapt this structure to the real project.

Do not create unnecessary folders or duplicate shared components.

A shared component may still power multiple pages, but each major page should have a clear entry point and a straightforward route-to-file mapping.

## Fix oversized files

Pay particular attention to:

- `Shell.tsx`
- `ResourcePage.tsx`
- `ResourceForm.tsx`
- `Academics.tsx`
- `AcademicControl.tsx`
- Dashboard components
- Course workspace components
- Analytics components

Split large files when they contain unrelated responsibilities.

For example, separate the application shell into appropriate modules for:

- Sidebar
- Header
- Breadcrumbs
- Institute selection
- Navigation configuration
- Role-based navigation
- Department Head teaching-workspace switching

Preserve existing behavior and styling.

Do not split files purely to increase file count.

---

# 5. PRESERVE EVERY PAGE AND ROUTE

Inspect the actual router and resource configuration to establish the authoritative inventory.

Previously documented routes include:

```text
/
/login
/forgot-password
/reset/:uid/:token
/platform
/platform-settings
/institutes/:id
/institute-settings
/student-admission
/academic-history
/student-placement/:id
/academic-reviews
/institute-setup
/academics
/teacher-appointments
/course/:id
/grades
/analytics
/predictions
/profile
/quiz-attempt/:id
/unauthorized
```

Previously documented resource routes include:

```text
/platform-audit
/platform-users
/institutes
/units
/years
/terms
/programs
/batches
/curriculum
/sections
/courses
/offerings
/memberships
/enrollments
/modules
/lessons
/materials
/assignments
/quizzes
/questions
/manual-grades
/question-bank
/submissions
/attempts
/attendance-sessions
/attendance
/timetable
/announcements
/notifications
/audit
```

Verify all routes against the current code.

Preserve course-workspace functionality, including:

- Overview
- Lessons
- Materials
- Assignments
- Quizzes
- Modules
- Progress
- Enrollments
- Attendance sessions
- Grades
- Performance
- Insights

Keep existing role-specific visibility and access restrictions.

Do not remove working pages merely because they share a generic component.

---

# 6. COMPLETE BACKEND CLEANUP

Reorganize the existing Django backend so that files and functions are understandable.

The current backend may use large modules such as:

- `views.py`
- `serializers.py`
- `models.py`
- `scope.py`
- Permission modules
- Governance modules
- Analytics modules

Inspect them and identify their responsibilities.

Where appropriate, split oversized modules into descriptive files organized by feature.

## Suggested organization

```text
backend/apps/
├── accounts/
│   ├── models.py
│   ├── permissions/
│   ├── views/
│   ├── serializers/
│   └── services/
│
├── academics/
│   ├── models.py
│   ├── views/
│   │   ├── departments.py
│   │   ├── programs.py
│   │   ├── academic_years.py
│   │   ├── course_offerings.py
│   │   ├── student_admission.py
│   │   └── student_placement.py
│   ├── serializers/
│   ├── services/
│   └── policies/
│
├── learning/
│   ├── models.py
│   ├── views/
│   │   ├── lessons.py
│   │   ├── assignments.py
│   │   ├── quizzes.py
│   │   ├── attendance.py
│   │   └── grading.py
│   ├── serializers/
│   ├── services/
│   └── policies/
│
├── insights/
│   ├── analytics/
│   ├── predictions/
│   └── reports/
│
└── settings/
```

This is an illustrative structure, not a requirement to recreate every directory.

Keep Django application registration, migrations, URL routing, model references, permissions, and serializers working.

## Naming

Use descriptive internal function names, such as:

- `admit_student`
- `place_student_in_section`
- `appoint_teacher_to_department`
- `assign_teacher_to_offering`
- `enroll_students_in_offering`
- `record_attendance`
- `submit_assignment_grade`
- `request_grade_correction`
- `approve_grade_correction`
- `calculate_student_gpa`
- `generate_student_predictions`

Avoid cryptic abbreviations.

Do not rename public interfaces without preserving compatibility.

## Backend documentation

For every major feature, document:

- What it does
- Which frontend page calls it
- Which API endpoint it uses
- Which view handles the request
- Which serializer validates it
- Which service performs the business operation
- Which permission rules apply
- Which database models are read or written
- Which tests protect it

---

# 7. DATABASE CLEANUP AND VISUAL EXPLORATION

Keep the existing PostgreSQL database.

The goal is to make it as easy to explore as a visual database browser.

Do not change the schema merely for cosmetic reasons.

## Database audit

Inspect every Django model and its relationships.

Document:

- Actual PostgreSQL table name
- Django model name
- Plain-English purpose
- Columns
- Data types
- Primary keys
- Foreign keys
- Unique constraints
- Important indexes
- Relationships
- Which workflows use the table
- Which roles can access the related records
- Whether the data is institute-scoped
- Whether the table contains sensitive information

Explain confusing names in simple English.

For example:

- Institute: an organization using the LMS
- Membership: a user's association with an institute and role
- Unit: an academic department or organizational unit
- Program: a study program
- Section: a class or student group
- Course: a subject in the catalog
- Offering: a course scheduled for a particular academic term or group
- Enrollment: a student's participation in an offering

Verify these descriptions against the real models.

## Database diagrams

Generate accurate diagrams from the actual models and schema.

Create:

- Complete database ER diagram
- Accounts and institutes diagram
- Academic structure diagram
- Student admission and enrollment diagram
- Teaching assignments diagram
- Attendance diagram
- Assignments and grading diagram
- Analytics and predictions data-flow diagram

Use Mermaid or another repository-friendly diagram format.

Do not invent relationships.

## Visual database explorer

Prepare beginner-friendly instructions for using **DBeaver Community** with the existing PostgreSQL database.

Document:

- How to start the Docker database container
- How to identify the correct PostgreSQL host and port
- How to locate connection settings safely
- How to connect using DBeaver
- How to browse schemas and tables
- How to view rows
- How to inspect columns
- How to inspect foreign keys
- How to filter records
- How to view relationships
- How to run read-only SQL queries
- How to avoid accidentally editing or deleting data

Never print database passwords or secrets into documentation.

Prefer read-only database access for exploration when practical.

Do not install desktop applications automatically.

## Database safety

Do not:

- Drop tables
- Reset the database
- Recreate Docker volumes
- Delete migrations
- Rename schema objects without approval
- Modify existing academic records
- Run destructive SQL
- Replace the database

Create documentation and visual exploration tools without disturbing the existing data.

---

# 8. PRESERVE THE FIVE ROLES

IntelliLMS supports five principal user experiences:

1. Super Admin
2. Institute Admin
3. Department Head
4. Teacher
5. Student

Preserve the existing authorization rules.

## Super Admin

- Platform administration
- Institute management
- Institute administrator management
- Platform settings
- Platform-level auditing
- Platform overview

Do not expose ordinary teacher and student management as routine platform-level functions.

## Institute Admin

- Institute configuration
- Academic structure management
- Department and program management
- Teacher provisioning
- Student admission
- Student placement
- Course offering creation
- Enrollment oversight
- Institute reports
- Authorized grade and attendance corrections
- Institute-wide administrative operations

## Department Head

- Department-scoped management
- Appointment of eligible teachers
- Teaching assignment oversight
- Department reporting
- Authorized correction reviews
- Separate personal teaching workspace when assigned to teach

Department Heads must not gain access to unrelated departments.

Correction review must respect explicit course-level delegation and reviewer restrictions.

## Teacher

- Assigned courses
- Lessons
- Materials
- Assignments
- Quizzes
- Attendance
- Grading
- Course analytics
- Authorized predictions

## Student

- Enrolled courses
- Released learning materials
- Assignment submissions
- Quiz attempts
- Released grades
- Attendance records
- Academic progress
- Personal academic history
- Notifications

Students must not access other students' private records.

Preserve backend authorization even if frontend navigation hides unauthorized pages.

---

# 9. PRESERVE SCHOOL, COLLEGE, AND UNIVERSITY BEHAVIOR

IntelliLMS is a generic, multi-tenant LMS.

It supports different types of institutions.

## Schools

- No departments
- No Department Head role
- Teachers assigned through the school administration workflow
- Classes and sections
- School-appropriate academic terminology
- School-specific academic progression

## Colleges

- Department structures where applicable
- Programs
- Classes and sections
- Year-based academic progression
- Teacher appointments
- Year-based reporting

## Universities

- Departments
- Programs
- Academic terms and semesters
- Course offerings
- Department Heads
- Semester-based progression
- GPA/CGPA where configured
- Department and program reporting

## Shared rules

Preserve:

- Institute isolation
- Academic structure validation
- Configurable terminology
- Enrollment validation
- Attendance
- Assessment workflows
- Reports
- Audit trails
- Role-based permissions

Do not hardcode university-specific assumptions throughout shared modules.

Where academic policies are currently duplicated, consolidate them carefully without changing behavior.

---

# 10. PRESERVE ALL WORKFLOWS

Inspect and preserve the existing implementation of:

1. Institute creation
2. Institute configuration
3. Academic department creation
4. Program creation
5. Academic year and term management
6. Class and section management
7. Teacher provisioning
8. Department teacher appointments
9. Teacher course assignments
10. Student admission
11. Student placement and transfers
12. Course catalog management
13. Course offering creation
14. Bulk enrollment
15. Lessons and materials
16. Assignment creation
17. Assignment submission
18. Quiz creation
19. Question bank management
20. Quiz attempts
21. Attendance recording
22. Attendance history
23. Grade entry
24. Grade release
25. Grade corrections
26. Attendance corrections
27. GPA/CGPA calculations
28. Analytics and reports
29. ML predictions
30. Notifications
31. Profile management
32. Platform settings
33. Institute settings
34. Audit logging

Do not simplify a workflow by removing its validation, authorization, history, or audit requirements.

Preserve low-click workflows, including inline creation of related academic records where already supported.

---

# 11. COURSE OFFERINGS ORGANIZATION

Preserve the intended department-first course offering experience.

For universities and applicable colleges:

- Show departments first.
- Selecting a department displays its course offerings.
- Allow filtering by semester for universities.
- Allow appropriate study-year filtering for colleges.
- Keep course offering creation accessible to authorized Institute Admins.
- Avoid redundant actions and confusing navigation.

For schools:

- Do not require departments.
- Use the applicable class, section, or program structure.

Do not redesign the page during this refactor.

Preserve the currently implemented user experience and document any difference between the implementation and these intended requirements.

---

# 12. ATTENDANCE, GRADES, AND CORRECTIONS

Preserve the existing academic integrity controls.

Teachers record attendance and grades within their authorized courses.

Released grades must respect configured protection policies.

Attendance editing must respect configured edit windows.

Corrections must use the existing audited authorization workflow.

Department Heads must not gain blanket correction approval rights.

Where explicit course-level delegation is required, preserve it.

Prevent users from approving their own correction requests where prohibited.

Preserve grade history, attendance history, reviewer records, reasons, and audit information.

---

# 13. ANALYTICS AND MACHINE LEARNING

Preserve all working analytics and ML functionality.

This includes, where implemented:

- Role-specific dashboards
- Student performance summaries
- Attendance analytics
- Gradebook statistics
- Class analysis
- Department reports
- Workload reporting
- Course comparisons
- Student risk indicators
- Predictions
- Model evaluation information
- CSV exports

The existing OULAD-based model predicts whether a student's next submitted assignment score will be below 40%, using previous assessment performance.

Do not misrepresent this as a prediction of final course failure, dropout, or attendance.

Preserve existing model files, preprocessing, inference logic, metrics, and authorized access.

Do not retrain models unnecessarily during refactoring.

---

# 14. PRESERVE THE EXISTING DESIGN

This task is not a UI redesign.

Preserve:

- Existing CSS
- Color variables
- Typography
- Sidebar
- Header
- Breadcrumbs
- Cards
- Tables
- Buttons
- Modals
- Forms
- Icons
- Spacing
- Responsive layouts
- Hover and focus states
- Dashboard visualizations

Previously requested visual accents include:

**Academic units/departments**
- Text: `#176447`
- Background: `#e8f4eb`
- Border: `#d4e9da`

**Programs**
- Text: `#3669a5`
- Background: `#eaf2fc`

These values are reference requirements, not a substitute for inspecting the actual current CSS.

Extract and document the complete actual design system from the repository.

Create `docs/DESIGN_SYSTEM.md` containing:

- Color palette
- CSS variables
- Typography
- Spacing conventions
- Component styles
- Sidebar styles
- Breadcrumb styles
- Card styles
- Table styles
- Form styles
- Responsive breakpoints

Do not change the design while documenting it.

---

# 15. IMPROVE CODE READABILITY

Apply consistent naming conventions.

Prefer descriptive names over unclear abbreviations.

Keep components and functions focused.

Remove genuine duplication when it can be done safely.

Add short comments for complex business rules.

Do not fill simple code with unnecessary comments.

Avoid:

- Giant conditional chains
- Unrelated responsibilities in one file
- Hidden side effects
- Duplicated permission rules
- Circular imports
- Excessive abstraction
- Unnecessary wrapper components
- Magic strings without explanation

Preserve performance characteristics.

Avoid creating additional database queries or frontend API requests merely to simplify code organization.

---

# 16. CREATE COMPLETE DEVELOPER DOCUMENTATION

Create a clear documentation directory:

```text
docs/
├── START_HERE.md
├── PROJECT_STRUCTURE.md
├── FRONTEND_PAGE_MAP.md
├── BACKEND_FEATURE_MAP.md
├── API_ENDPOINT_MAP.md
├── DATABASE_DICTIONARY.md
├── DATABASE_RELATIONSHIPS.md
├── DATABASE_EXPLORER_GUIDE.md
├── ROLES_AND_PERMISSIONS.md
├── SCHOOL_COLLEGE_UNIVERSITY_RULES.md
├── FEATURE_WORKFLOWS.md
├── DESIGN_SYSTEM.md
├── ANALYTICS_AND_ML.md
├── TESTING_GUIDE.md
├── WHERE_TO_EDIT.md
└── refactoring/
    ├── CODEBASE_AUDIT.md
    ├── REFACTORING_PLAN.md
    └── CHANGELOG.md
```

Use the existing documentation structure where practical. Update rather than create duplicate conflicting documents.

## START_HERE.md

Explain the complete project in beginner-friendly English:

- What IntelliLMS does
- Technology stack
- Frontend architecture
- Backend architecture
- Database architecture
- How the three institution types differ
- How the five roles work
- How to start the project
- How frontend requests reach the backend
- How the backend accesses PostgreSQL
- How to inspect the database
- Where to find each feature
- How to make changes safely

## FRONTEND_PAGE_MAP.md

For every page include:

- Page name
- Route
- Entry component
- Supporting components
- API calls
- Allowed roles
- Purpose

## BACKEND_FEATURE_MAP.md

For every major feature include:

- Feature name
- Backend files
- Endpoint handlers
- Serializers
- Services
- Permissions
- Models
- Related frontend pages

## DATABASE_DICTIONARY.md

For every table include:

- Name
- Purpose
- Fields
- Relationships
- Constraints
- Related workflows

## WHERE_TO_EDIT.md

Create a beginner-friendly reference such as:

| I want to change... | Frontend location | Backend location | Database model |
|---|---|---|---|
| Student Dashboard | Actual path | Actual path | Actual models |
| Course Offerings | Actual path | Actual path | Actual models |
| Teacher Appointments | Actual path | Actual path | Actual models |
| Attendance | Actual path | Actual path | Actual models |
| Gradebook | Actual path | Actual path | Actual models |
| Predictions | Actual path | Actual path | Actual models |

Fill this using verified repository paths.

Never invent file locations.

---

# 17. AUTOMATED VERIFICATION

After refactoring, run all available relevant checks.

Include:

- Django system checks
- PostgreSQL-backed backend tests
- Frontend unit tests
- TypeScript checks
- Frontend production build
- Browser/end-to-end tests
- Permission tests
- Tenant isolation tests
- School workflows
- College workflows
- University workflows
- Teacher appointment workflows
- Student admission workflows
- Attendance and grade workflows
- Analytics and ML tests where available

Use the project's actual test commands.

Do not silently substitute SQLite tests for PostgreSQL verification.

If PostgreSQL is unavailable, report that clearly and distinguish any alternative smoke tests from full database verification.

Do not invent test results.

Fix regressions caused by refactoring.

Do not delete failing tests merely to obtain a passing result.

Where browser tests are available, compare important pages before and after refactoring to detect visual regressions.

---

# 18. DATABASE AND DATA PROTECTION

Before running any database-related command:

- Identify the correct Docker Compose configuration.
- Verify the target database.
- Inspect migration status.
- Avoid destructive commands.
- Preserve existing volumes.
- Preserve user data.

Do not run database resets.

Do not create new migrations unless genuinely necessary and explicitly justified.

A source-code organization refactor should ordinarily require no database schema changes.

Never expose passwords or sensitive configuration values in documentation or logs.

---

# 19. CHECKPOINT AND CONTINUE BEHAVIOR

This is a long-running task.

Continue working autonomously through all safe changes.

Maintain:

`docs/refactoring/PROGRESS.md`

Update it regularly with:

- Completed work
- Files changed
- Tests executed
- Test results
- Remaining work
- Known issues
- Current checkpoint
- Next action

If execution or context limits interrupt the task, provide a concise checkpoint.

When I say **"Continue"**:

1. Read `docs/refactoring/PROGRESS.md`.
2. Inspect the current Git diff and repository state.
3. Identify what is already completed.
4. Resume from the next unfinished task.
5. Avoid repeating completed modifications.
6. Continue until the full assignment is complete.

Do not declare the project finished while significant requested work remains.

---

# 20. FINAL ACCEPTANCE CRITERIA

The task is complete only when:

- Every existing major page is easy to locate.
- Page names and entry filenames are understandable.
- Oversized components have been appropriately simplified.
- Backend features have recognizable locations.
- School, college, and university rules remain correct.
- All five roles retain their intended permissions.
- Tenant isolation remains enforced.
- All existing workflows remain functional.
- API contracts remain compatible.
- PostgreSQL data and schema remain intact.
- The database can be explored using documented visual tools.
- Database tables and relationships are documented.
- Frontend-to-backend-to-database mappings are available.
- The existing UI appearance is preserved.
- Existing automated checks pass, or any remaining failures are accurately reported.
- Complete beginner-friendly documentation is available.
- No user work has been overwritten or discarded.

## FINAL REPORT

When finished, provide:

1. Summary of improvements
2. New frontend structure
3. New backend structure
4. Database documentation created
5. Important files renamed or reorganized
6. List of preserved routes and APIs
7. Tests executed and results
8. Remaining limitations
9. Instructions for running the project
10. Instructions for exploring PostgreSQL visually
11. Location of `START_HERE.md`
12. Location of `WHERE_TO_EDIT.md`

**Begin working immediately. Inspect the real repository, make the necessary safe improvements, document everything, verify the results, and continue until the full IntelliLMS cleanup is complete.**