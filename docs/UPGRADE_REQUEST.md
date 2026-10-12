# INTELLILMS — COMPLETE FIXING, IMPROVEMENT & PREMIUM REDESIGN MASTER PROMPT

## ONE CONTINUOUS FULL-STACK IMPLEMENTATION

You are the lead full-stack engineer, software architect, UI/UX designer, database engineer, security engineer, and QA engineer for my existing Final Year Project, **IntelliLMS**.

Your mission is to fix the problems discovered during manual testing, improve the existing academic workflows, strengthen role-based permissions, add missing management functionality, improve AI-powered academic insights, and significantly enhance the visual design.

**PROJECT LOCATION:**

`C:\Users\Luveabid\Documents\New project`

**TECHNOLOGY STACK:**

- React, TypeScript, Vite
- Django and Django REST Framework
- PostgreSQL
- Existing SQLite development support
- Python and scikit-learn for experimental machine learning
- Existing Docker and automated testing infrastructure

IntelliLMS is a multi-institute Learning Management System supporting universities, colleges, and schools.

Its five main roles are:

1. Platform Super Admin
2. Institute Admin
3. Department Head
4. Teacher
5. Student

The original implementation baseline has been completed according to the latest Codex report.

The latest reported verification included:

- 74 backend tests passed, with four PostgreSQL-only tests skipped in that run.
- 25 frontend tests passed.
- 20 Chromium browser workflows passed.
- Frontend build, type checking, Django checks, migration drift, and OpenAPI validation passed.
- PostgreSQL and Docker verification had passed in an earlier session.

These are historical results. Do not assume they remain valid after your modifications.

# 0. ABSOLUTE EXECUTION REQUIREMENTS

**THIS IS ONE CONTINUOUS IMPLEMENTATION TASK.**

Do not divide this request into separate user-approved phases.

You may organize internal implementation steps for engineering safety, but do not stop after each feature and ask whether to continue.

Implement all requirements in one continuous execution.

Do not simply audit the application or write recommendations.

Do not stop after fixing navigation, staff management, enrollment, AI insights, or UI design.

Continue until the complete requested scope is implemented and tested, or an actual technical/environmental blocker prevents further work.

If execution or context limits interrupt the work:

- Preserve all implemented changes.
- Keep the repository in a stable state.
- Update progress documentation.
- Record exactly what remains unfinished.
- Provide a continuation instruction.
- Never claim incomplete work is finished.

## Protect the existing application

Before editing:

1. Read AGENTS.md.
2. Read README.md.
3. Read IMPLEMENTATION_PROGRESS.md.
4. Read docs/limitations.md.
5. Read docs/audit-current.md if present.
6. Inspect existing models, views, serializers, services, routes, frontend components, and tests.
7. Inspect Git status and preserve uncommitted work.
8. Create a safe Git checkpoint or equivalent backup without discarding user changes.

Do not:

- Rewrite IntelliLMS from scratch.
- Reset the database.
- Destroy demo data.
- Delete historical academic records.
- Replace functional features with placeholders.
- Weaken CSRF protection.
- Weaken authentication.
- Break multi-institute isolation.
- Introduce unnecessary dependencies.
- Invent statistics or ML results.

Reuse existing infrastructure and components where appropriate.

Reproduce reported defects before changing their implementations.

---

# 1. CORRECT ROLE-BASED NAVIGATION AND RESPONSIBILITIES

The current LMS has excessive overlap between roles.

Super Admin, Institute Admin, Department Head, and Teacher currently share too many administrative and academic navigation items.

Redesign navigation and workflows according to real institutional responsibilities.

## 1.1 PLATFORM SUPER ADMIN

Super Admin manages the IntelliLMS platform, not everyday academic operations.

### Primary sidebar

- Platform Dashboard
- Institutes
- Platform Accounts
- Platform Analytics
- Platform Audit
- Platform Settings
- My Profile

### Responsibilities

- Create and manage institutes.
- Activate and deactivate institutes.
- Appoint and replace Institute Admins.
- Manage authorized platform accounts.
- Review platform usage and aggregate statistics.
- Review platform-level audit logs.
- Manage platform settings.
- Monitor operational health.

### Remove from ordinary Super Admin navigation

- My Courses
- Assignments
- Quizzes
- Attendance
- Gradebook
- Academic Progress
- Teaching Timetable
- Institute Settings
- Teacher-oriented Learning Insights

Super Admin should not routinely create assignments, grade students, or record attendance.

Merge redundant Overview and Platform Overview pages.

Provide authorized aggregate institute oversight instead of unrestricted individual academic access.

If platform support access is necessary, it must be explicitly scoped, authorized, and audited.

## 1.2 INSTITUTE ADMIN

Institute Admin manages an authorized institute.

### Primary sidebar

- Institute Dashboard
- Students & Staff
- Courses & Enrollments
- Academic Structure
- Academic Calendar & Timetable
- Marks & Attendance Oversight
- Reports & Analytics
- AI Student Insights
- Announcements
- Institute Settings
- My Profile

### Responsibilities

- Add and manage students.
- Add, edit, deactivate, reactivate, and remove institute staff.
- Appoint and replace Department Heads.
- Change authorized staff roles.
- Manage departments, programs, academic years, terms, and sections.
- Manage course catalogs and course offerings.
- Manage student enrollment.
- Configure grading policies.
- Configure attendance policies.
- Review institute-wide grades and attendance.
- Approve academic record corrections.
- Review academic reports.
- Review authorized AI insights.
- Manage institute settings and announcements.

**Important: Department Heads assign teachers to courses.**

Institute Admin may review assignments and use a documented, audited administrative override when necessary.

Institute Admin has oversight of marks and attendance, while teachers perform routine grading and attendance recording.

Institute Admin must never access another institute's private academic data.

## 1.3 DEPARTMENT HEAD

Department Head manages their assigned department.

### Primary sidebar

- Department Dashboard
- Department Students & Staff
- Department Courses
- Teacher Assignments
- Department Performance
- AI Student Insights
- Department Timetable
- Announcements
- My Profile

### Responsibilities

- Assign teachers to course offerings and sections within their department.
- Unassign or reassign teachers.
- Review teaching workload.
- Monitor department courses.
- Monitor department student performance.
- Review department grades and attendance.
- Review authorized experimental student risk estimates.
- Identify students who may need support.

### Restrictions

- Cannot manage unrelated departments.
- Cannot change institute-wide policies.
- Cannot grant themselves privileged roles.
- Cannot edit unrelated academic records.
- Cannot access platform administration.

If a Department Head also teaches, provide a clearly separated teaching workspace.

## 1.4 TEACHER

### Primary sidebar

- Teaching Dashboard
- My Courses
- My Students
- Assignments & Grading
- Quizzes & Question Bank
- Attendance
- Class Performance
- AI Student Insights
- Timetable
- Announcements
- My Profile

### Responsibilities

- Access assigned courses.
- View students enrolled in assigned classes.
- Upload lessons and materials.
- Create assignments.
- Create quizzes.
- Grade submissions.
- Enter marks.
- Record attendance.
- Review class performance.
- View authorized experimental AI estimates.
- Request corrections when institute policy requires approval.

Teachers cannot manage unrelated courses, institute memberships, privileged roles, or institute settings.

Replace the generic People interface with an appropriate My Students roster.

## 1.5 STUDENT

### Primary sidebar

- Dashboard
- My Courses
- Assignments
- Quizzes
- My Attendance
- Grades
- My Progress & Insights
- Timetable
- Announcements
- My Profile

### Responsibilities

- Access enrolled courses.
- View learning materials.
- Submit assignments.
- Attempt quizzes.
- View released grades.
- View personal attendance.
- Review progress.
- Receive appropriate learning guidance.
- Customize permitted profile information.

Students must never access other students' private records.

## 1.6 BACKEND AUTHORIZATION

Do not simply hide sidebar links.

Enforce permissions at:

- API endpoint level
- Queryset level
- Object level
- Create/update/delete action level
- Institute level
- Department level
- Course offering level
- Student level

Add regression tests for unauthorized direct API requests.

Preserve tenant isolation and prevent privilege escalation.

---

# 2. COMPLETE STAFF MANAGEMENT AND ROLE CHANGES

IntelliLMS needs proper staff lifecycle management.

Staff members must be able to join, leave, be promoted, be demoted, or change responsibilities.

## Required functionality

Authorized administrators must be able to:

- Add Teachers.
- Edit Teacher details.
- Deactivate Teachers.
- Reactivate Teachers.
- Remove Teachers from an institute.
- Reassign Teachers' courses.
- Appoint Department Heads.
- Replace Department Heads.
- Promote Teachers to Department Heads.
- Change Department Heads back to Teachers.
- Remove staff roles.
- Remove institute memberships.
- Search and filter staff by name, department, role, and status.

## Permission ownership

### Super Admin

- Appoint Institute Admins.
- Replace Institute Admins.
- Deactivate or remove Institute Admin access.

### Institute Admin

- Add and manage institute staff.
- Appoint and replace Department Heads.
- Change authorized staff roles.
- Deactivate or remove staff memberships.

### Department Head

- Assign teachers to courses.
- Unassign teachers.
- Reassign teaching responsibilities within their department.

Department Heads cannot appoint other Department Heads or promote themselves.

## Department Head replacement workflow

Example:

Omar is Department Head of Computer Science.

A new Department Head joins.

Institute Admin should be able to:

1. Open Staff Management or Department Management.
2. Select Computer Science.
3. Choose Replace Department Head.
4. Select an eligible replacement.
5. Choose whether Omar becomes a Teacher, retains another authorized role, or loses the relevant membership.
6. Review consequences.
7. Confirm.
8. Immediately update permissions.
9. Preserve Omar's historical actions.
10. Ensure the department has its intended leadership assignment.

Use safe database transactions.

## Teacher removal workflow

Example:

Amina leaves the university.

Institute Admin should be able to:

1. Open Students & Staff.
2. Find Amina.
3. Choose Deactivate or Remove from Institute.
4. Review her active course assignments.
5. Reassign affected courses.
6. Confirm.
7. Revoke relevant access.
8. Preserve grades, attendance, submissions, and audit records.

Clearly distinguish:

- Deactivate global account.
- Remove institute membership.
- Remove staff role.
- Unassign from course.

These operations must not be treated as identical.

Prevent accidental removal of the last required administrator.

Immediately refresh or revoke permissions after role changes.

Audit all sensitive staff changes.

---

# 3. CONSISTENT ADD, EDIT, ARCHIVE, AND REMOVE ACTIONS

The current LMS has too few obvious removal options.

Some management pages support editing but not deactivation, withdrawal, archival, or safe removal.

Inspect all relevant screens.

Resources include:

- Institutes
- Platform accounts
- Institute memberships
- Students
- Teachers
- Department Heads
- Departments
- Programs
- Academic years
- Terms
- Sections
- Course catalogs
- Course offerings
- Teacher assignments
- Student enrollments
- Lessons
- Assignments
- Quizzes
- Quiz questions
- Attendance records
- Announcements
- Timetables

Implement appropriate combinations of:

- Add
- View
- Edit
- Activate
- Deactivate
- Archive
- Restore
- Unassign
- Withdraw
- Remove membership
- Delete safe drafts

Do not implement permanent deletion everywhere.

Preserve historical academic records.

Keep institute activation/deactivation as the normal institute lifecycle mechanism.

Allow authorized deletion of safe drafts where appropriate.

Use a consistent Actions menu in management tables.

Provide confirmation dialogs for sensitive actions.

Clearly explain consequences before confirmation.

Prevent dangerous cascading deletion.

---

# 4. FIX STUDENT CREATION AND ENROLLMENT

Current problems:

- Platform Accounts and institute People management are confusing.
- Creating a student and enrolling the student are disconnected.
- Enrollment selectors have shown matching records without visible selectable options.
- Dropdown pagination and validation are awkward.

Investigate and fix the actual issues.

## Desired workflow

**Students & Staff → Add Student → Save**

**Courses & Enrollments → Select Course → Enroll Students**

## Requirements

- Create student accounts through the frontend.
- Assign appropriate institute memberships.
- Assign program/section where applicable.
- Search students by name, username, or student ID.
- Display visible and selectable search results.
- Fix dropdown clipping, scrolling, focus, and validation.
- Support multi-select.
- Support bulk enrollment.
- Show already-enrolled students.
- Prevent duplicate enrollments.
- Support withdrawal and eligible reactivation.
- Provide clear feedback.
- Use server-side search and pagination.
- Maintain tenant isolation.

Support CSV student import where appropriate.

Provide templates, preview, duplicate detection, validation, and row-level errors.

Do not load thousands of student records into one frontend dropdown.

---

# 5. SIMPLIFY ACADEMIC STRUCTURE AND SETTINGS

The Academic Structure interface is currently fragmented and overwhelming.

Preserve the existing academic models but improve navigation.

Suggested groups:

1. Departments & Programs
2. Academic Years & Terms
3. Classes & Sections
4. Course Catalog

Move everyday enrollment operations into Courses & Enrollments.

Provide concise contextual help.

Avoid oversized management cards and unnecessary navigation steps.

## Institute terminology

Provide presets:

- University
- College
- School

Move advanced singular/plural terminology settings into a collapsed Advanced Settings area.

Preserve customization capability.

---

# 6. UNIFIED TEACHER COURSE WORKSPACE

When a Teacher opens an assigned course, provide a unified workspace.

Tabs or sections:

- Overview
- Lessons & Materials
- Students
- Assignments
- Quizzes
- Attendance
- Grades
- Class Performance
- AI Insights

Provide clear primary actions:

- Add Lesson
- Create Assignment
- Create Quiz
- Record Attendance
- Grade Submissions
- View Class Performance

Avoid scattering routine teaching tasks across unrelated pages.

Preserve existing working features.

---

# 7. BULK QUIZ QUESTION CREATION

The current quiz authoring process requires too much individual question entry.

Implement:

1. Bulk question editor.
2. Add multiple questions in one session.
3. CSV question import.
4. XLSX import if practical.
5. Downloadable templates.
6. Import preview.
7. Row-level validation errors.
8. Reusable question bank.
9. Search and filter question bank.
10. Select multiple questions for a quiz.
11. Duplicate quiz structure without copying student attempts.
12. Correct-answer validation.
13. Marks validation.
14. Question ordering.
15. Safe handling of existing quizzes with attempts.

Preserve the existing single-question editor.

Do not break submitted attempts or grading history.

---

# 8. MARKS AND ATTENDANCE GOVERNANCE

Implement the agreed academic responsibility model.

## Institute Admin

Controls:

- Grading policies
- Attendance policies
- Grade release policies
- Institute-wide academic oversight
- Correction approval
- Authorized emergency corrections

## Department Head

Can:

- Monitor department marks.
- Monitor department attendance.
- Review department performance.
- Participate in delegated correction review where configured.

## Teacher

Can:

- Record attendance for assigned classes.
- Grade assigned students.
- Enter marks.
- Request corrections where required.
- Correct records according to institute policy.

## Student

Can:

- View own released marks.
- View own attendance.
- Cannot edit academic records.

## Academic record integrity

- Protect finalized grades.
- Preserve correction history.
- Require reasons for sensitive corrections.
- Record old value, new value, actor, and timestamp.
- Prevent silent overwrites.
- Enforce permissions at the backend.

---

# 9. CLASS-WIDE ACADEMIC PERFORMANCE ANALYTICS

Current Learning Insights focuses too heavily on individual student selection.

Implement a class-first analytics experience.

Allow authorized filters for:

- Institute
- Department
- Program
- Academic year
- Course
- Section

Show:

- Student roster
- Attendance percentage
- Assignment completion
- Quiz performance
- Released grade summary
- Course progress
- Missing work
- Class averages
- Performance trends

Support:

- Search
- Filters
- Sorting
- Server-side pagination
- Efficient aggregation
- Individual student drill-down
- Authorized export

Distinguish unique students from course enrollment counts.

Design for large institutes without loading all records into the browser.

---

# 10. EXPERIMENTAL AI/ML INSIGHTS

IntelliLMS currently uses a scikit-learn logistic regression model trained on synthetic demonstration data.

It has not been validated using authorized historical student data.

Preserve this distinction.

## Bulk class analysis

Implement an authorized Analyze Class workflow.

Generate experimental risk estimates for eligible students in a selected course or section.

Include:

- Bulk inference
- Progress tracking
- Background execution where appropriate
- Partial failure handling
- Duplicate-job prevention
- Prediction timestamps
- Model version tracking
- Missing-data handling
- Tenant and role authorization

Avoid unnecessary infrastructure.

## AI dashboard

Show:

- Eligible students
- Students analyzed
- Low/moderate/high experimental risk counts
- Latest analysis date
- Searchable student table
- Actual academic performance indicators
- Experimental estimate
- Individual details

Clearly distinguish actual academic data from model-generated estimates.

Do not invent accuracy or model explanations.

## Role-based access

Super Admin:
- Platform ML operational status and aggregate usage.

Institute Admin:
- Institute-wide authorized analytics.

Department Head:
- Department-scoped analytics.

Teacher:
- Assigned-course analytics.

Student:
- Own academic progress and appropriate recommendations.

## Notifications

Provide authorized academic-support notifications.

Examples:

- Low attendance based on actual records.
- Missing assignments.
- Declining released assessment performance.

Keep rule-based academic indicators separate from experimental ML estimates.

Avoid duplicate notifications.

Do not automatically send alarming experimental risk labels to students.

Keep student-facing automated ML risk alerts disabled by default until appropriate validation and authorization.

Never change grades, enrollment, or academic standing automatically based on experimental ML output.

---

# 11. IMPROVE STUDENT DASHBOARD AND PERSONAL INSIGHTS

The current student dashboard is clean but too generic.

It should answer:

1. What do I need to do today?
2. What is overdue?
3. How am I performing?
4. What should I do next?

Prioritize:

- Upcoming deadlines
- Pending assignments
- Upcoming quizzes
- Overdue work
- Recent grades
- Attendance
- Course progress
- Learning recommendations

## My Progress & Insights

Include:

- Course-by-course progress
- Assignment performance
- Quiz performance
- Attendance trends
- Academic activity
- Helpful explanations
- Actionable recommendations

Keep useful charts, but do not let them dominate the page.

Fix excessive decimal formatting.

Incorrect: `65.66666666666667%`

Correct: `65.7%`

Use clear labels, accessible charts, and helpful empty states.

Do not fabricate data when records are missing.

---

# 12. PROFILE PICTURES AND PERSONALIZATION

All five roles need a usable My Profile page.

Implement:

- Upload profile picture.
- Replace profile picture.
- Remove profile picture.
- Edit permitted personal information.
- Change password securely.
- Manage notification preferences.
- Optional light/dark theme.

Requirements:

- Optional image.
- Initials fallback.
- Safe file validation.
- File size limits.
- Secure storage and delivery.
- Appropriate image handling.
- Backend authorization.
- No unauthorized role changes.
- No unauthorized institute membership changes.

Preserve existing Profile & Security functionality.

Display profile pictures consistently in appropriate navigation and roster views.

---

# 13. PREMIUM VISUAL REDESIGN

**IMPORTANT: I ALREADY LIKE THE EXISTING INTELLILMS DESIGN. DO NOT REPLACE ITS IDENTITY.**

The existing design is clean, professional, green, and white.

However, it looks too simple, has limited color variation, excessive whitespace, repetitive dashboards, and insufficient visual polish.

Upgrade it to look like a premium, modern educational SaaS product.

## Visual direction

Preserve:

- IntelliLMS branding.
- Green-and-white identity.
- Clean academic appearance.
- Familiar navigation patterns.
- Existing working interactions.

Improve:

- Color richness.
- Typography.
- Card layouts.
- Dashboard composition.
- Icons.
- Tables.
- Forms.
- Charts.
- Navigation.
- Empty states.
- Loading states.
- Responsive design.
- Micro-interactions.

## Color system

Use a coherent design token system.

Suggested palette:

- Forest green for primary branding.
- Emerald green for primary actions.
- Mint for soft highlights.
- Warm off-white for page backgrounds.
- Slate/charcoal for typography.
- Muted blue for information.
- Amber for warnings.
- Restrained red for destructive actions.
- Subtle purple accents for AI-related features.

Use color purposefully.

Do not turn the interface into a rainbow.

Ensure accessible contrast.

## Dashboards

Replace repetitive oversized motivational banners with compact, role-specific welcome sections.

Make dashboards visually richer with:

- Attractive summary cards.
- Meaningful icons.
- Subtle gradients.
- Useful charts.
- Quick actions.
- Deadlines.
- Notifications.
- Status indicators.
- Better visual hierarchy.

Each role should have different dashboard content.

## Sidebar

Improve:

- Logical grouping.
- Icons.
- Active navigation state.
- Collapsible sections where appropriate.
- Spacing.
- Responsive behavior.
- Consistent role-specific navigation.

Avoid overcrowding.

## Cards

Use:

- Refined borders.
- Soft shadows.
- Balanced spacing.
- Subtle color accents.
- Rounded corners.
- Professional typography.
- Useful hover and focus states.

Avoid giant decorative cards and excessive empty space.

## Forms

Improve:

- Field labels.
- Help text.
- Validation.
- Searchable dropdowns.
- Date/time controls.
- Multi-select.
- Confirmation dialogs.
- Success/error feedback.

Replace generic labels such as "Create Record" with meaningful actions.

## Tables

Include appropriate:

- Search.
- Filters.
- Sorting.
- Pagination.
- Status badges.
- Actions menus.
- Bulk selection.
- Responsive behavior.
- Loading and empty states.

## Charts

Improve:

- Readability.
- Labels.
- Legends.
- Tooltips.
- Color consistency.
- Percentage formatting.
- Explanations.
- Responsive layout.

Preserve the existing Python-based chart generation approach where appropriate rather than introducing an unnecessary JavaScript charting dependency.

## Accessibility

Ensure:

- Keyboard navigation.
- Visible focus states.
- Accessible contrast.
- Proper labels.
- Semantic headings.
- Screen-reader-friendly controls.
- Responsive layouts.
- Reduced-motion support.

All five roles must share one consistent design system.

---

# 14. NOTIFICATIONS AND FEEDBACK

Improve relevant role-based notifications.

Examples:

- Teacher receives a new submission notification.
- Student sees an approaching assignment deadline.
- Department Head sees teaching assignment changes.
- Institute Admin sees pending correction requests.
- Teacher sees academic-support alerts.

Requirements:

- Role-specific visibility.
- Backend authorization.
- Read/unread state where appropriate.
- Useful destination links.
- No private data leakage.
- Duplicate prevention.
- Clear timestamps.
- Appropriate empty states.

Reuse existing notification infrastructure if available.

Do not fabricate notification events.

---

# 15. PERFORMANCE AND SCALABILITY

Design the LMS to remain usable with large student populations.

Implement:

- Server-side pagination.
- Server-side search.
- Efficient filtering.
- Efficient aggregations.
- Appropriate database indexes.
- Avoidance of N+1 queries.
- Bounded API responses.
- Sensible bulk-operation limits.
- Background processing for long-running work where justified.
- Loading indicators and progress feedback.

Do not claim tested 10,000-student scalability without benchmarking it.

---

# 16. COMPLETE REGRESSION TESTING

Test the upgraded application thoroughly.

## Backend

Verify:

- Authentication and CSRF.
- Role authorization.
- Tenant isolation.
- Department isolation.
- Course access restrictions.
- Staff creation and deactivation.
- Department Head replacement.
- Teacher removal.
- Course reassignment.
- Student creation and enrollment.
- Bulk enrollment.
- Marks and attendance corrections.
- Quiz question import.
- ML inference and batch analysis.
- Notification permissions.
- Profile updates.

## Frontend

Verify:

- Role-specific navigation.
- Role-specific dashboards.
- Staff management.
- Enrollment selectors.
- Quiz authoring.
- Class analytics.
- Student insights.
- Profile customization.
- Accessible forms.
- Loading, empty, and error states.

## Browser end-to-end workflows

Test:

1. Super Admin creates an institute and appoints Institute Admin.
2. Institute Admin creates a department and appoints Department Head.
3. Institute Admin adds a Teacher.
4. Department Head assigns Teacher to a course.
5. Institute Admin adds and enrolls Students.
6. Teacher records attendance.
7. Teacher creates an assignment and quiz.
8. Student submits work and attempts quiz.
9. Teacher grades work.
10. Student views released marks.
11. Department Head reviews performance.
12. Institute Admin reviews marks and attendance.
13. Authorized user analyzes class performance.
14. Experimental ML estimates are generated and labeled correctly.
15. Institute Admin replaces Department Head.
16. Institute Admin removes a Teacher and reassigns courses.
17. All roles update permitted profile information.

Test unauthorized access attempts as well.

## Technical verification

- PostgreSQL tests.
- SQLite development compatibility where applicable.
- Frontend typecheck.
- Frontend build.
- Django checks.
- Migration checks.
- OpenAPI validation.
- Existing Docker workflow compatibility.
- Browser console errors.
- Desktop/mobile responsiveness.

Do not hide failing tests.

---

# 17. DOCUMENTATION

Update:

- README.md
- IMPLEMENTATION_PROGRESS.md
- docs/limitations.md
- docs/audit-current.md where appropriate
- Role-permission documentation
- Academic workflow documentation
- ML limitations

Document:

- Implemented changes.
- Permissions.
- Database migrations.
- Testing results.
- Setup instructions.
- Known limitations.
- Any unfinished work.

Do not claim ML validation on real-world student data.

---

# 18. FINAL ACCEPTANCE CRITERIA

The upgrade is complete when:

1. All five roles have appropriate dashboards and navigation.
2. Super Admin is focused on platform management.
3. Institute Admin manages institutional operations and academic governance.
4. Department Head assigns teachers within their department.
5. Teachers manage their assigned teaching activities.
6. Students access only their own academic records.
7. Staff can be added, replaced, reassigned, deactivated, and safely removed.
8. Historical academic data survives staff changes.
9. Appropriate management actions exist throughout the LMS.
10. Student enrollment is straightforward.
11. Bulk enrollment works.
12. Academic management is easier to navigate.
13. Teacher course workflows are unified.
14. Bulk quiz question creation works.
15. Marks and attendance oversight is properly authorized.
16. Academic corrections are audited.
17. Class-level academic analytics work.
18. Experimental ML estimates can be generated for authorized classes.
19. AI limitations are communicated clearly.
20. Students receive useful progress guidance.
21. Users can customize permitted profile details and profile pictures.
22. The UI is more premium, modern, colorful, and polished.
23. Existing functionality remains operational.
24. Backend authorization and tenant isolation are verified.
25. Relevant automated tests pass.

---

# 19. FINAL EXECUTION COMMAND

**IMPLEMENT ALL REQUIREMENTS IN ONE CONTINUOUS DEVELOPMENT TASK.**

Start by inspecting the current repository and understanding the working baseline.

Implement changes in a safe dependency order.

You may use internal checkpoints for testing, but do not ask for approval between them.

For each internal checkpoint:

1. Implement actual code.
2. Add or update tests.
3. Run relevant checks.
4. Fix regressions.
5. Update progress documentation.
6. Continue immediately.

Do not stop after producing an audit.

Do not replace working features with placeholders.

Do not sacrifice security for visual polish.

Do not introduce destructive migrations.

Do not overwrite uncommitted work.

If a genuine external blocker occurs, document it and continue with independent work.

If execution limits interrupt the task, save progress and provide an exact continuation instruction.

## FINAL REPORT REQUIRED

When finished, report:

- Features implemented.
- Major architectural changes.
- Database migrations.
- Role-permission changes.
- Staff management changes.
- Academic workflow improvements.
- AI/ML improvements.
- UI/UX improvements.
- Tests executed and their results.
- Remaining limitations.
- Exact commands to run the application.

Distinguish fully implemented, tested, partially implemented, and blocked features.

**FINAL OBJECTIVE:**

Transform the existing IntelliLMS into a polished, secure, professional, role-correct, visually attractive, easy-to-use, AI-powered Learning Management System suitable for a strong university Final Year Project demonstration.

Preserve the existing IntelliLMS identity and working functionality.

**START IMPLEMENTING NOW. CONTINUE AUTONOMOUSLY. DO NOT STOP FOR APPROVAL BETWEEN FEATURES.**