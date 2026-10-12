# INTELLILMS — FINAL UNIFIED MASTER IMPLEMENTATION, FIXING, ACADEMIC MANAGEMENT & PREMIUM REDESIGN PROMPT

## THE COMPLETE INTELLILMS PROJECT COMPLETION MISSION

**Project directory:**

`C:\Users\Luveabid\Documents\New project`

You are continuing development of **IntelliLMS**, an AI-powered, multi-institute Learning Management System designed for schools, colleges, and universities.

This is an existing, substantially implemented final-year BS Computer Science project.

**DO NOT RESTART THE PROJECT. DO NOT REBUILD WORKING FEATURES. DO NOT RESET THE DATABASE.**

Your task is to complete, correct, connect, improve, and redesign the existing system according to this specification.

This prompt consolidates and supersedes conflicting instructions from all previous IntelliLMS fixing, improvement, and redesign prompts.

The original project specification remains relevant for existing baseline functionality, but where responsibilities or acceptance criteria conflict, **this final prompt takes precedence**.

---

# 0. CRITICAL EXECUTION INSTRUCTIONS

This is **ONE CONTINUOUS IMPLEMENTATION MISSION**.

Do not divide the project into separate user-approved phases.

You may organize work internally into dependency-based checkpoints, but do not ask the user to approve each checkpoint.

Do not stop after creating an audit, plan, checklist, or partial feature.

Implement actual working code.

Continue through remaining requirements until completion, a genuine blocker, or the execution limit.

If interrupted by usage or context limits, preserve progress and record the exact continuation point.

## Before changing anything

Read:

- `AGENTS.md`
- `README.md`
- `IMPLEMENTATION_PROGRESS.md`
- `docs/limitations.md`
- Relevant architecture and API documentation
- Original FYP specification
- Current Git status and diff
- Existing backend and frontend implementations
- Existing automated tests

Inspect the actual repository before deciding what is missing.

Preserve all existing uncommitted work.

Create or verify a safe recovery checkpoint without overwriting an existing backup unnecessarily.

Do not use destructive Git commands.

Do not reset or recreate the existing database.

Do not delete demo accounts, historical academic records, or user data.

Preserve existing authentication, CSRF protection, institute isolation, migrations, and working academic features.

## Previously reported implementation progress

Earlier Codex sessions reported implementation or testing of:

- Original IntelliLMS academic baseline.
- Staff lifecycle and course reassignment.
- Department Head replacement.
- Bulk student enrollment.
- Bulk quiz APIs and question-bank operations.
- Academic Structure navigation improvements.
- Unified course workspace.
- Super Admin teaching-access restrictions.
- Department Head teacher-course assignment permissions.
- Experimental class-wide ML analysis.
- Private profile-image APIs.
- Notification preferences.
- Student agenda and progress suggestions.
- Various PostgreSQL, frontend, and Chromium tests.

**These are historical reports, not proof that the actual user-facing features are complete.**

The user has personally identified broken or confusing workflows despite passing tests.

Therefore, independently verify the actual browser experience before marking anything complete.

## Completion status rules

Track each feature separately as:

1. Backend implemented
2. Frontend connected
3. Correct permissions enforced
4. Real browser workflow verified
5. UI/UX acceptable
6. Regression tests passed

Do not mark a feature fully complete unless the relevant criteria are satisfied.

---

# 1. INTELLILMS ADMINISTRATIVE HIERARCHY

IntelliLMS has five principal roles:

1. Super Admin
2. Institute Admin
3. Department Head
4. Teacher
5. Student

These roles must have distinct responsibilities, navigation, dashboards, permissions, and workflows.

**Account creation, academic appointment, and teaching assignment are different operations.**

This distinction is mandatory.

## 1.1 Super Admin — Platform Owner

Super Admin manages the IntelliLMS platform, not routine academic operations.

Responsibilities:

- Create institutes.
- Configure institute type and initial settings.
- Appoint the first Institute Admin.
- Appoint additional Institute Admins.
- Replace Institute Admins.
- Revoke Institute Admin memberships safely.
- Activate, suspend, or archive institutes.
- Manage authorized platform administrators.
- View platform-wide aggregate statistics.
- Review platform audit events.
- Manage platform-level configuration and operational status.

Super Admin must NOT routinely:

- Browse individual Student accounts.
- Browse individual Teacher accounts.
- Manage Department Head appointments.
- Create ordinary Student or Teacher accounts.
- Create departments, subjects, or course offerings.
- Assign Teachers to classes.
- Enroll Students in courses.
- Grade assignments or record attendance.

### Critical existing issue

The current Super Admin Platform Accounts screen exposes ordinary Student and Teacher accounts.

**Fix this.**

Replace the mixed account-management interface with:

**Institute Administrators & Platform Access**

The normal Super Admin account interface should show:

- Platform administrators.
- Institute Admin accounts and their institute memberships.
- Institute administrative contacts.
- Administrative account status and appointment actions.

Super Admin may view aggregate counts of Students and Teachers, but should not routinely browse their personal account records.

Enforce this restriction in backend querysets, serializers, permissions, and API actions—not merely by hiding rows in React.

Preserve necessary internal system administration and audit capabilities without exposing unrestricted academic account management through ordinary Super Admin workflows.

## 1.2 Institute Admin — Institutional Administrator

Institute Admin manages the institute and its academic structure.

Responsibilities:

- Configure institute profile.
- Create and manage departments.
- Create and manage academic programs.
- Create the subject/course catalog.
- Configure curricula.
- Assign subjects to programs and semesters.
- Create academic years and terms.
- Create admission batches/cohorts.
- Create classes and sections.
- Create course offerings.
- Create official Teacher login accounts.
- Create Student accounts.
- Appoint and replace Department Heads.
- Manage account activation and institute memberships.
- Admit Students.
- Assign Students to programs, batches, and sections.
- Manage Student course enrollment.
- Configure grading and attendance policies.
- Manage institutional timetable and academic calendar.
- Oversee institute-wide marks, attendance, and performance.
- Approve protected academic record corrections.
- Review institute-level audit events.
- Manage institutional announcements and settings.

**Important:** Institute Admin creates a Teacher's official account but does not normally appoint that Teacher to a department or assign daily teaching responsibilities.

Those are Department Head responsibilities.

Institute Admin may perform an exceptional teaching-assignment override only with an explicit reason and audit record.

## 1.3 Department Head — Department Teaching Manager

Department Head controls teaching appointments and assignments within their authorized department.

Responsibilities:

- View eligible Teacher accounts provisioned by Institute Admin.
- Appoint eligible Teachers to the department.
- Remove or transfer departmental teaching appointments within authorized rules.
- Assign Teachers to subjects, course offerings, and sections.
- Reassign or unassign Teachers.
- Manage departmental teaching workloads.
- Monitor departmental courses.
- Monitor Teacher activity and academic performance.
- Review departmental Student progress.
- View authorized departmental AI insights.
- Manage delegated departmental scheduling.
- Propose curriculum changes for Institute Admin review where supported.

Department Head must NOT:

- Create institute-wide login accounts.
- Appoint Institute Admins.
- Appoint other Department Heads unless explicitly authorized by an institutional policy.
- Deactivate global user accounts.
- Access unrelated departments.
- Change institute-wide academic policies.

### Teacher eligibility rule

Institute Admin provisions Teacher accounts and may associate them with eligible departments.

Department Head can appoint Teachers from the institute's eligible Teacher pool.

Department Head cannot appoint arbitrary platform users or Teachers from unrelated institutes.

Cross-department appointments require appropriate institutional authorization.

## 1.4 Teacher — Academic Delivery

Teacher manages assigned course offerings.

Responsibilities:

- View assigned classes.
- Manage lessons and learning materials.
- Create assignments.
- Create quizzes.
- Create and reuse questions.
- Record attendance.
- Grade submissions.
- Release results according to policy.
- View class performance.
- View authorized experimental AI insights.
- Identify Students needing academic support.
- Submit protected grade or attendance correction requests.

Teachers must not access unauthorized courses, departments, or Student records.

## 1.5 Student — Learner

Student can:

- View enrolled courses.
- Access lessons and materials.
- Submit assignments.
- Attempt quizzes.
- View own attendance.
- View released grades.
- View timetable.
- View upcoming and missed deadlines.
- View personal progress and recommendations.
- Manage own permitted profile information.

Students must not modify official academic records or access another Student's information.

---

# 2. COMPLETE ACCOUNT AND APPOINTMENT LIFECYCLE

Implement three distinct layers.

## Layer A — Account provisioning

Determines who creates the login account.

- Super Admin provisions Institute Admins.
- Institute Admin provisions Teachers, Students, and Department Head candidates.
- Users activate their accounts through secure invitations.

## Layer B — Academic appointment

Determines someone's institutional or departmental responsibility.

- Super Admin appoints Institute Admins.
- Institute Admin appoints Department Heads.
- Department Head appoints eligible Teachers to their department.

## Layer C — Teaching assignment

Determines which course offerings and sections a Teacher manages.

- Department Head assigns Teachers to authorized departmental course offerings.
- Institute Admin can override exceptionally with a reason and audit record.

### Required Teacher workflow

1. Institute Admin creates Amina's Teacher account.
2. Amina receives a secure invitation.
3. Amina sets her password.
4. Department Head opens Department Teachers.
5. Department Head selects Amina from eligible Teachers.
6. Department Head appoints Amina to Computer Science.
7. Department Head assigns Amina to CS101, Section A.
8. Amina logs in and sees the assigned course.
9. Department Head may later reassign or remove her teaching responsibilities.
10. Existing grades, attendance, and audit history remain intact.

An account can exist without an active departmental appointment.

A departmental appointment can exist without a current course assignment.

Removing a teaching assignment must not delete the account.

Deactivating an account must revoke access safely.

Support legitimate multiple roles and memberships without permission leakage.

## Staff management actions

Implement context-appropriate:

- Create account
- Invite
- Resend invitation
- Edit permitted details
- Activate
- Deactivate
- Appoint
- Reassign
- Unassign
- Replace
- Remove institute membership
- Archive
- Restore where valid

Show consequence-review dialogs before sensitive changes.

Preserve historical records.

Prevent removing the last active Institute Admin.

Audit old and new assignments, reasons, actors, and timestamps.

---

# 3. COMPLETE ACADEMIC STRUCTURE

IntelliLMS must support the following connected concepts:

- Institute
- Department
- Academic Program
- Subject/Course Catalog
- Curriculum
- Program-Subject Mapping
- Academic Year
- Term/Semester
- Admission Batch/Cohort
- Class/Section
- Course Offering
- Departmental Teacher Appointment
- Teacher-Course Assignment
- Student Academic Membership
- Student Course Enrollment

Inspect existing models before adding anything.

Reuse existing entities wherever possible.

Avoid duplicate tables and competing academic structures.

## 3.1 Departments

Institute Admin creates, edits, and archives departments.

Examples:

- Computer Science
- Mathematics
- Business Administration

Department Heads manage academic delivery within assigned departments.

## 3.2 Programs

Institute Admin creates programs under departments.

Examples:

- BS Computer Science
- BS Mathematics
- BBA

Support appropriate program duration, academic structure, and status.

## 3.3 Subjects and course catalog

Institute Admin creates reusable subject definitions.

Examples:

- CS101 — Programming Fundamentals
- CS102 — Object-Oriented Programming
- MTH101 — Calculus

Include appropriate metadata:

- Subject code
- Title
- Description
- Credit hours where applicable
- Department
- Active/archive status

Prevent duplicate codes within the appropriate institute scope.

## 3.4 Curriculum

Institute Admin maps subjects to programs and semesters.

For example:

BS Computer Science:

Semester 1:
- Programming Fundamentals
- Calculus
- Introduction to Computing

Semester 2:
- Object-Oriented Programming
- Discrete Mathematics
- Digital Logic

Support appropriate required/elective distinctions where the existing design permits.

## 3.5 Academic years and terms

Institute Admin creates academic years and terms.

Examples:

- Academic Year 2026–2027
- Fall 2026
- Spring 2027

Support term status and relevant dates.

## 3.6 Batches and sections

Institute Admin creates:

- Admission batches
- Cohorts
- Classes
- Sections

Examples:

- BSCS Batch 2026
- Section A
- Section B

Allow authorized Student transfers while preserving historical records.

## 3.7 Course offerings

A subject and a course offering are different.

**Subject:** CS101 — Programming Fundamentals

**Course offering:** CS101 — Fall 2026 — BSCS Section A

Each offering can have its own:

- Academic term
- Section
- Assigned Teachers
- Enrolled Students
- Timetable
- Materials
- Assignments
- Quizzes
- Attendance
- Grades
- Performance analytics

Institute Admin creates course offerings.

Department Head assigns eligible Teachers to them.

## 3.8 Academic integrity

Prevent invalid relationships.

Do not allow enrollment in nonexistent offerings.

Do not allow unauthorized Teacher assignment.

Prevent duplicate enrollment.

Protect historical academic records when a subject, section, Teacher, or program changes.

Prefer archival or status changes over destructive deletion when records are referenced.

---

# 4. GUIDED INSTITUTE SETUP

A newly created institute must be operable without Django Admin or manual database edits.

After Super Admin creates the institute and appoints an Institute Admin, provide a guided setup experience.

## Setup checklist

1. Complete institute profile.
2. Create departments.
3. Create programs.
4. Add subjects.
5. Configure curricula.
6. Create academic years and terms.
7. Create batches and sections.
8. Create course offerings.
9. Create Teacher accounts.
10. Appoint Department Heads.
11. Department Heads appoint Teachers.
12. Department Heads assign Teachers to courses.
13. Admit Students.
14. Enroll Students.
15. Configure academic policies.
16. Start academic operations.

Provide progress indicators and direct links.

Allow saving and resuming setup.

Do not create unnecessary new architecture if existing pages can be integrated into a coherent guided experience.

## School, college, and university support

Use institute-type terminology presets.

For example:

University:
- Departments
- Programs
- Semesters
- Course offerings

School:
- Grades
- Classes
- Sections
- Subjects
- Academic sessions

College:
- Appropriate programs, years, sections, and subjects

Do not force every school to configure university-style credit hours or departments.

Preserve a shared underlying academic model where practical.

---

# 5. SIMPLE STUDENT ADMISSION AND ENROLLMENT

The user has reported that creating and enrolling a new Student is unnecessarily complicated.

Fix this end to end.

## Main entry point

**Institute Admin → Students & Staff → Students → Add Student**

## Guided admission

### Step 1 — Student details

Collect:

- First name
- Last name
- Email
- Student ID/roll number
- Department where applicable
- Program/grade
- Admission batch
- Academic year
- Section

Use appropriate terminology based on institute type.

### Step 2 — Academic placement

Allow selection of:

- Program
- Batch
- Section
- Relevant course offerings

Offer sensible enrollment suggestions based on curriculum and term.

Allow enrollment later when necessary.

### Step 3 — Review

Display:

- Student identity
- Institute membership
- Academic placement
- Selected course enrollments
- Invitation status

### Step 4 — Create and invite

Create or securely link the Student account.

Assign correct institute membership.

Create appropriate academic placement and enrollments.

Issue a secure password-setup invitation.

Use safe transactions, validation, and retry behavior.

Do not create duplicate accounts or duplicate enrollments.

## Student CSV import

Provide:

- Downloadable template
- CSV upload
- Preview
- Row-level validation
- Duplicate detection
- Program/section validation
- Import confirmation
- Error report
- Invitation status

Support server-side search and pagination for large Student lists.

Fix any dropdown that claims matching Students exist but does not display selectable results.

## Student academic changes

Support safe:

- Section transfer
- Program transfer where institutionally valid
- Course withdrawal
- Re-enrollment
- Repeated subjects
- Academic status changes

Preserve academic history and enforce appropriate permissions.

---

# 6. AUTHENTICATION, INVITATIONS AND PASSWORD RECOVERY

The existing authentication implementation has reportedly passed some security tests, but the user has not verified the complete real-world experience.

Implement and browser-test all workflows.

## Registration policy

- No public Student self-registration by default.
- No public Teacher self-registration by default.
- Authorized administrators provision accounts.
- Users create their own passwords.
- Never email plaintext passwords.

## Invitations

Default policy:

- One-time invitation token.
- Expiration after 48 hours.
- Secure password setup.
- Correct role and institute membership.
- Clear expired-link handling.
- Resend invitation.
- Visible invitation and email-delivery status.

## Password policy

- Minimum 12 characters.
- Reject common passwords.
- Use established secure password hashing.
- Apply appropriate password validation.
- Do not log passwords or reset tokens.

## Forgot password

Implement:

1. User opens Forgot Password.
2. Enters email.
3. Receives a generic confirmation response.
4. Receives a secure reset link if eligible.
5. Opens the reset page.
6. Creates a new password.
7. Token becomes unusable.
8. User can log in with the new password.

Default reset-token lifetime: 30 minutes.

Prevent token replay and account enumeration.

## Additional authentication requirements

Verify:

- Correct login
- Invalid credentials
- Disabled accounts
- First-time setup
- Password changes
- Logout
- Session invalidation where appropriate
- CSRF protection
- Rate limiting
- Multiple institute memberships
- Correct role redirects
- Expired invitations
- Reused reset links
- Email failure recovery

Test email delivery using a development email backend or controlled test inbox.

Document production SMTP configuration separately.

Do not claim production email delivery has been verified unless it actually has.

---

# 7. ROLE-SPECIFIC NAVIGATION AND DASHBOARDS

The current UI still reuses generic navigation and dashboard designs.

This must change.

## 7.1 Super Admin navigation

- Platform Dashboard
- Institutes
- Institute Administrators
- Platform Analytics
- Platform Audit
- Platform Settings
- My Profile

No routine academic teaching menus.

## 7.2 Institute Admin navigation

- Institute Dashboard
- Students & Staff
- Departments & Programs
- Subjects & Curriculum
- Years, Terms & Sections
- Courses & Enrollments
- Academic Calendar
- Marks & Attendance Oversight
- Reports & AI Insights
- Announcements
- Institute Settings
- My Profile

Do not present the Institute Admin with the same primary navigation as a Teacher.

## 7.3 Department Head navigation

- Department Dashboard
- Department Teachers
- Teacher Appointments
- Teacher Assignments
- Department Courses
- Department Students
- Department Performance
- AI Insights
- Department Timetable
- Announcements
- My Profile

If the Department Head also teaches, provide a separate, clearly labeled Teaching Workspace.

Do not mix department-management actions with personal teaching actions.

## 7.4 Teacher navigation

- Teaching Dashboard
- My Courses
- My Students
- Assignments & Grading
- Quizzes & Question Bank
- Attendance
- Class Performance
- AI Insights
- Timetable
- Announcements
- My Profile

## 7.5 Student navigation

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

## Dashboard requirements

Each dashboard must have meaningful role-specific content.

Super Admin:
- Institutes
- Administrative accounts
- Platform activity
- Operational status
- Audit summaries

Institute Admin:
- Students
- Teachers
- Departments
- Programs
- Enrollment
- Attendance
- Academic performance
- Pending approvals
- Management shortcuts

Department Head:
- Department Teachers
- Pending appointments
- Course assignments
- Workload
- Department performance
- Unassigned offerings

Teacher:
- Assigned classes
- Upcoming lessons
- Pending grading
- Attendance tasks
- Quiz management
- Student support alerts

Student:
- Upcoming deadlines
- Overdue work
- Enrolled courses
- Attendance
- Released grades
- Progress recommendations

Remove repetitive generic motivational banners and redundant overview sections.

---

# 8. FIX PROFILE PICTURES AND PROFILE MANAGEMENT

The user reports that profile picture controls do not work correctly.

Do not assume passing backend tests prove the browser experience works.

Verify:

- Selecting an image
- Previewing it
- Uploading it
- Saving it
- Displaying it on the profile
- Updating the top-right avatar
- Persisting after refresh
- Persisting after logout/login
- Replacing it
- Removing it
- Restoring initials
- Correct privacy and permissions
- Clear error messages

Use appropriate image validation, size limits, and metadata stripping.

Investigate media URLs, authenticated image retrieval, CSRF, browser caching, and frontend state synchronization.

Improve the UI with:

- Choose Photo
- Preview
- Save Photo
- Remove Photo

Also provide appropriate profile editing, password change, and notification preferences for each role.

---

# 9. FIX BULK QUIZ QUESTION AUTHORING

The user still encounters a narrow, old-fashioned single-question modal and cannot easily use bulk authoring.

The backend may already support bulk operations.

Inspect and connect the actual frontend.

The Teacher must clearly see:

- Add Single Question
- Add Multiple Questions
- Import Questions from CSV
- Select from Question Bank
- Duplicate Quiz

## Bulk editor

Provide a spacious editor supporting multiple question rows.

Each question should support appropriate:

- Question text
- Question type
- Answer choices
- Correct answer
- Marks
- Ordering

Allow:

- Add row
- Remove row
- Duplicate row
- Reorder questions
- Preview
- Validate
- Save all

## CSV import

Provide:

- Downloadable template
- Upload
- Preview
- Row-level errors
- Confirm import

## Question bank

Support reusable questions with appropriate course and ownership permissions.

## Quiz integrity

Preserve existing attempts.

Do not silently modify questions after attempts have begun.

Do not copy Student attempts when duplicating a quiz.

Verify the complete Teacher browser workflow.

---

# 10. UNIFIED TEACHER COURSE WORKSPACE

Each assigned course offering should have one coherent workspace.

Suggested sections:

- Overview
- Lessons & Materials
- Students
- Assignments
- Quizzes
- Attendance
- Grades
- Class Performance
- AI Insights

Provide relevant quick actions.

Keep course context consistent across tabs.

Avoid forcing Teachers to repeatedly search for the same course.

Respect assigned-course permissions.

Use paginated, server-filtered data where necessary.

---

# 11. MARKS, ATTENDANCE AND ACADEMIC GOVERNANCE

## Teacher responsibilities

- Record attendance.
- Grade assignments and quizzes.
- Review submissions.
- Release results according to policy.
- Request protected corrections when required.

## Institute Admin responsibilities

- Configure grading policies.
- Configure attendance policies.
- Oversee institutional academic records.
- Approve or reject protected corrections.
- Review correction history.

## Department Head responsibilities

- Monitor departmental academic records.
- Review department performance.
- Handle explicitly delegated review actions.

## Protected corrections

Implement correction requests with:

- Record being corrected
- Original value
- Proposed value
- Reason
- Requesting user
- Approval status
- Approving user
- Timestamps
- Audit history

Prevent unauthorized or silent changes to protected records.

## Attendance UI improvements

The existing Attendance screen contains confusing repeated entries and generic actions.

Improve:

- Course filters
- Section filters
- Date selection
- Session titles
- Student attendance summaries
- Clear action labels
- Tooltips
- Confirmation dialogs
- Pagination
- Correction workflows

## Grading presentation

Display sensible decimal formatting.

Do not show values like `65.66666666666667%`.

Use readable precision such as `65.7%` where appropriate.

---

# 12. CLASS, DEPARTMENT AND INSTITUTE ANALYTICS

Provide useful analytics at appropriate authorization scopes.

## Teacher

- Assigned-class attendance
- Grade distributions
- Submission completion
- Missing work
- Student performance trends

## Department Head

- Department course performance
- Teacher workload
- Department attendance trends
- Academic progress by section or program

## Institute Admin

- Institute-wide enrollment
- Attendance
- Grade distributions
- Completion trends
- Program and department comparisons
- Academic support indicators

## Super Admin

- Aggregate institute-level platform statistics
- Operational and adoption metrics

Avoid exposing ordinary Student-level records to Super Admin.

Use server-side filtering, pagination, and efficient aggregation.

Clearly distinguish unique Students from enrollments.

Do not claim scalability without testing.

---

# 13. EXPERIMENTAL AI STUDENT INSIGHTS

IntelliLMS includes experimental machine-learning-based Student performance analysis.

The existing model uses synthetic demonstration data.

**Do not claim real-world predictive accuracy or validated educational outcomes.**

Preserve the experimental labeling.

## Teacher and Department Head

Provide authorized class or department analysis.

Support:

- Batch analysis
- Progress indicators
- Resume where supported
- Model version and timestamp
- Missing-data handling
- Student-level authorized results
- Observed attendance and missing-work indicators

## Institute Admin

Provide appropriately scoped aggregate academic insights.

## Student

Show supportive recommendations based on recorded academic data.

Do not display unvalidated ML risk labels as authoritative judgments.

Do not automate punitive academic decisions.

Keep recorded academic facts separate from experimental predictions.

---

# 14. STUDENT DASHBOARD AND PROGRESS

Improve Student experience with:

- Upcoming deadlines
- Missed deadlines
- Recent released grades
- Attendance
- Enrolled courses
- Progress charts
- Actionable recommendations
- Clear links to assignments and lessons

Exclude completed submissions from overdue lists.

Avoid generic charts without useful interpretation.

Ensure Students see only their own information.

---

# 15. NOTIFICATIONS AND ANNOUNCEMENTS

Complete actual event-based notifications, not only notification preferences.

Examples:

- Account invitation
- Teacher appointment
- Teacher course assignment
- Course enrollment
- New assignment
- Upcoming deadline
- Released grade
- Correction approval
- Academic announcement
- Relevant Student support reminder

Notifications must be:

- Role-appropriate
- Institute-scoped
- Private
- Linked to the relevant page
- Deduplicated where necessary
- Governed by notification preferences where appropriate

Do not expose another user's private academic information.

---

# 16. CONSISTENT CRUD AND SAFE DATA MANAGEMENT

Management pages should expose appropriate actions:

- Add
- View
- Edit
- Search
- Filter
- Activate
- Deactivate
- Archive
- Restore
- Assign
- Unassign
- Remove membership
- Delete safe drafts

Do not provide indiscriminate permanent deletion.

Use consequence reviews and confirmations for sensitive operations.

Preserve historical grades, attendance, attempts, enrollments, and audit events.

Keep backend permissions aligned with visible UI actions.

---

# 17. PREMIUM INTELLILMS UI/UX REDESIGN

The user has explicitly reported that the current UI still looks old, generic, and repetitive.

The redesign must visibly change the actual application.

Do not only modify design tokens or CSS variables.

## Visual identity

Preserve IntelliLMS's existing green-and-white branding.

Enhance it with:

- Forest green
- Emerald
- Mint
- Warm off-white
- Muted blue
- Amber
- Subtle purple accents for AI features

Use color meaningfully.

Avoid childish or excessively flashy styling.

## Design requirements

- Modern typography
- Strong visual hierarchy
- Consistent spacing
- Attractive but compact dashboards
- Better icons
- Clear navigation groups
- Modern data tables
- Better forms
- Better dropdowns
- Better dialogs
- Useful empty states
- Loading indicators
- Clear error messages
- Success feedback
- Responsive layouts
- Accessible contrast
- Keyboard navigation

## Specific problems to fix

- Oversized generic banners
- Excessive empty space
- Identical-looking dashboards
- Long flat sidebars
- Confusing management actions
- Narrow scrolling forms
- Poorly discoverable bulk operations
- Generic labels that do not match the user's role
- Inconsistent visual styling

## Institute Admin

Build a genuine institutional management interface.

Do not simply reuse the Teacher dashboard.

## Department Head

Make department management and Teacher appointment central.

## Teacher

Make course delivery, grading, quizzes, and attendance central.

## Student

Make learning progress and upcoming responsibilities central.

## Super Admin

Make institute and platform administration central.

---

# 18. PERFORMANCE AND SCALE

Use:

- Server-side pagination
- Server-side search
- Bounded queries
- Appropriate database indexes
- Efficient aggregation
- Avoidance of N+1 queries
- Controlled bulk operations
- Background processing where justified

Do not load thousands of Students into a single frontend dropdown.

Test realistic academic data volumes where feasible.

Do not invent benchmark results.

---

# 19. MANDATORY SECURITY REQUIREMENTS

Preserve and verify:

- Authentication
- CSRF protection
- Secure password handling
- Institute isolation
- Department isolation
- Course-level authorization
- Object-level permissions
- Role-based API access
- Invitation token security
- Password reset security
- Audit trails
- Safe file uploads
- Secure profile-image access
- Session handling
- Protection against privilege escalation

Hiding a navigation link is not authorization.

Test direct unauthorized API requests.

---

# 20. COMPLETE END-TO-END ACCEPTANCE TEST

Create isolated test data and verify the complete journey in the actual browser.

Do not rely exclusively on existing demo records.

## Scenario A — Platform setup

1. Super Admin logs in.
2. Super Admin creates a new institute.
3. Super Admin appoints an Institute Admin.
4. Super Admin sees only appropriate administrative accounts.
5. Super Admin cannot routinely browse ordinary Teacher and Student accounts.

## Scenario B — Institute setup

6. Institute Admin activates the account.
7. Institute Admin logs in.
8. Institute Admin completes institute profile.
9. Institute Admin creates a department.
10. Institute Admin creates a program.
11. Institute Admin creates subjects.
12. Institute Admin configures curriculum.
13. Institute Admin creates academic year and term.
14. Institute Admin creates batch and section.
15. Institute Admin creates course offerings.

## Scenario C — Teacher management

16. Institute Admin creates a Teacher account.
17. Teacher receives an invitation and activates the account.
18. Institute Admin appoints a Department Head.
19. Department Head logs in.
20. Department Head appoints the eligible Teacher to the department.
21. Department Head assigns the Teacher to a course offering.
22. Teacher logs in and sees the assigned course.
23. Unauthorized Teachers cannot access that course.

## Scenario D — Student admission

24. Institute Admin opens Add Student.
25. Creates a Student with academic placement.
26. Enrolls the Student in appropriate offerings.
27. Student receives a secure invitation.
28. Student sets a password.
29. Student logs in.
30. Student sees correct enrolled courses.

## Scenario E — Teaching and learning

31. Teacher uploads learning material.
32. Teacher creates an assignment.
33. Teacher adds multiple quiz questions.
34. Teacher imports questions from CSV.
35. Student accesses learning material.
36. Student submits an assignment.
37. Student attempts a quiz.
38. Teacher records attendance.
39. Teacher grades work.
40. Student views released results.

## Scenario F — Academic governance

41. Teacher requests a protected grade or attendance correction.
42. Institute Admin reviews the request.
43. Authorized approval or rejection is recorded.
44. Audit history remains intact.

## Scenario G — Authentication

45. Student logs out.
46. Student requests password reset.
47. Student receives a reset link.
48. Student changes password.
49. Reused or expired tokens are rejected.
50. Disabled accounts cannot access protected operations.

## Scenario H — Profile

51. User selects a profile picture.
52. Uploads it.
53. Sees it in the profile and header.
54. Refreshes and verifies persistence.
55. Replaces the picture.
56. Removes the picture.

## Scenario I — Academic changes

57. Department Head reassigns a Teacher.
58. Previous unauthorized course access is revoked.
59. Historical grades and attendance remain intact.
60. Institute Admin transfers a Student between valid sections.
61. Historical enrollment records remain preserved.

## Scenario J — Security and presentation

62. Test all five role dashboards.
63. Verify all five navigation menus.
64. Test unauthorized role access.
65. Test cross-institute isolation.
66. Test cross-department restrictions.
67. Verify responsive desktop and mobile layouts.
68. Verify accessible forms and keyboard navigation.
69. Verify notifications and reporting.
70. Verify experimental ML labeling.

Use isolated fixtures and safe test environments.

Do not alter real user credentials or destroy existing data.

---

# 21. TESTING AND QUALITY GATES

Run relevant:

- Django backend tests
- PostgreSQL tests
- Frontend unit and interaction tests
- TypeScript typecheck
- Frontend production build
- Django system checks
- Migration drift checks
- OpenAPI/schema validation
- Chromium end-to-end tests
- Permission and security tests
- Responsive layout checks
- Accessibility checks

Do not repeat expensive infrastructure tests unnecessarily when unrelated code has not changed.

When a test fails, determine whether it reveals a real defect or an outdated test expectation.

Do not weaken security or remove meaningful assertions merely to make tests pass.

Capture fresh screenshots of major redesigned screens and compare them with the user-reported old UI.

Verify that the current frontend and backend servers are actually serving the updated code.

---

# 22. DOCUMENTATION AND PROGRESS TRACKING

Maintain `IMPLEMENTATION_PROGRESS.md` as the authoritative implementation checklist.

Include:

- Requirement
- Existing implementation
- Changes made
- Backend status
- Frontend status
- Browser verification
- Security verification
- Remaining work
- Known limitations

Update:

- README
- Setup instructions
- Relevant API documentation
- Architecture notes
- Known limitations
- Testing instructions
- Production configuration guidance

Do not claim the experimental ML model has been validated on real Student data.

Do not claim production SMTP, TLS, or recovery procedures have been verified unless they actually have.

---

# 23. IMPLEMENTATION PRIORITY ORDER

Work in this dependency order while remaining within ONE continuous task.

## Priority 1 — Correct account hierarchy and permissions

- Super Admin account visibility
- Institute Admin responsibilities
- Department Head Teacher appointments
- Teacher assignment permissions
- Backend authorization

## Priority 2 — Complete academic structure

- Departments
- Programs
- Subjects
- Curriculum
- Terms
- Batches
- Sections
- Course offerings
- Institute setup workflow

## Priority 3 — Complete real account workflows

- Student admission
- Student enrollment
- Teacher account creation
- Invitations
- First login
- Forgot password
- Password changes
- Profile picture functionality

## Priority 4 — Fix broken academic workflows

- Bulk quiz authoring
- Course workspace
- Attendance
- Grading
- Academic correction approvals
- Management actions

## Priority 5 — Complete academic intelligence

- Class reports
- Department reports
- Institute analytics
- Experimental ML insights
- Student progress
- Notifications

## Priority 6 — Premium UI/UX

- All five role dashboards
- All five navigation systems
- Academic management pages
- Forms and dialogs
- Tables
- Responsive layout
- Accessibility

## Priority 7 — Final verification

- Complete institute-to-student browser journey
- Security regression
- PostgreSQL regression
- Frontend regression
- Final documentation
- Honest completion report

These priorities are internal implementation dependencies, not separate tasks requiring user approval.

When work can safely be combined, implement related backend, frontend, and browser acceptance tests together.

Do not postpone obvious user-facing fixes merely to finish unrelated low-value work.

---

# 24. USAGE-LIMIT AND CONTINUATION RULES

Codex usage limits may interrupt execution.

Before interruption where possible:

1. Preserve the current code.
2. Update IMPLEMENTATION_PROGRESS.md.
3. Record completed features.
4. Record partially implemented features.
5. Record tests passed and failed.
6. Record unresolved errors.
7. Record exact next steps.
8. Preserve the existing database and working application.

At the next session, resume from the current repository state.

Do not recreate the project.

Do not reimplement completed features.

Do not rerun the entire audit unnecessarily.

Do not ask the user to paste every previous prompt again.

---

# 25. FINAL COMPLETION CRITERIA

IntelliLMS is complete only when:

- Super Admin manages institutes and Institute Admins rather than ordinary academic accounts.
- Institute Admin can fully configure and operate an institute.
- Institute Admin can create Teacher accounts.
- Department Head can appoint eligible Teachers and assign them to courses.
- Students can be admitted and enrolled through a simple workflow.
- Invitations, login, and password reset work end to end.
- Departments, programs, subjects, terms, sections, and offerings are correctly connected.
- Teachers can deliver learning activities and grade Students.
- Students can complete activities and view their own progress.
- Marks and attendance governance is enforced.
- Bulk quiz authoring is accessible and functional.
- Profile pictures work in the real browser.
- Analytics and experimental AI insights are appropriately scoped.
- Notifications work.
- All five roles have distinct, modern, usable dashboards and navigation.
- Academic history and institute isolation are preserved.
- The complete new-institute acceptance journey passes.
- Relevant tests pass.
- Documentation accurately describes the final system and remaining limitations.

**Do not declare the upgrade complete merely because automated tests pass or API endpoints exist.**

The final system must be understandable and usable by a real institute administrator, Department Head, Teacher, and Student.

---

# FINAL EXECUTION COMMAND

Continue from the existing IntelliLMS repository.

Read the current progress and Git changes.

Preserve everything that works.

Implement every incomplete requirement from this consolidated specification.

Fix all user-reported functional and UI/UX problems.

Verify actual browser workflows.

Update progress continuously.

Do not request approval between internal implementation checkpoints.

Do not stop after an audit or partial implementation.

If interrupted, preserve progress and resume at the next available execution.

**START IMPLEMENTING THE FINAL INTELLILMS COMPLETION MISSION NOW.**