# User guides

## Super Admin

Sign in with a protected platform account. Institutes lists all institutes, including inactive ones. Add an institute with a unique code and category; edit its active flag to deactivate it. Select an active institute in the sidebar before managing its records. Invite an administrator through People. In Platform accounts, search for an existing user and choose Link to selected institute, then set the membership role and academic unit. Edit Active account to disable platform access; administrator accounts cannot be disabled through this screen. This differs from a membership status change, which affects only one institute. Account-status changes are recorded in Django admin LogEntry. The global overview appears when no institute is selected. Audit history shows the selected institute's tracked changes.

## Institute Admin

Select your institute. In Academic structure, create units, years, terms, programs and sections; then define reusable courses. Invite teachers/students in People or import a CSV. Created users receive a password-setup email through the configured backend. Add course offerings, choose instructors, and create enrollments. Update a membership's active flag to revoke access to this institute without disrupting other memberships. Manage announcements, review grades/attendance and export course progress CSV.

CSV headers are `username,email,role,first_name,unit`. Role is student or teacher; unit is an exact institute unit name. A duplicate account or invalid row rejects the whole import. Download the error CSV, correct the source, and retry. Existing accounts are not overwritten.

## Department Head

Your membership must have an academic unit. My courses shows only offerings whose course belongs to that unit. Create departmental offerings, assign eligible teachers, and enroll departmental students. Review scoped people, gradebook, attendance, announcements and predictions. Unit descendants are not automatically included. Academic structure changes remain an institute administrator function.

## Teacher

Open an assigned course. Use Modules and Lessons to create ordered content. Mark a lesson Published to make it visible; optional visibility dates delay access. Upload Materials linked to a lesson. Add assignments with deadlines, maximum marks and resubmission/late policies. Use Submissions to read work, assign marks, give feedback and release results. Students see no unreleased marks or feedback.

For quizzes, create the quiz, then use Questions to add MCQ, true/false, or short answer items. MCQ correct answers must exactly match a choice; boolean answers are `true` or `false`. Set availability, time and attempt limits. After attempts start, only release status remains editable on the quiz and questions are locked. Results permits manual short-answer marking. A score stays pending until all short answers are graded.

Create an attendance session and use Mark attendance to review each learner. Existing statuses are loaded; unmarked students default to present. The roster loads 50 students at a time with search and page controls. Save attendance applies only to the displayed page. Save or discard your page edits before searching or moving to another page; failed saves retain your edits for retry. Excused entries are excluded from percentage denominators; late counts as attended. Learning insights shows optional experimental estimates when sufficient observations and a trusted model exist.

Assignments can include a private supporting resource. Students download it from the assignment list or submission dialog. Grade history on submissions, quiz attempts and manual assessments lets authorized staff review saved marks and release changes. Quiz settings lock after attempts exist; its edit dialog then exposes only release status.

Use Question bank from a course to keep reusable questions and copy them into an editable quiz. Manual assessments record practical or oral marks and feedback. Set the offering's assignment, quiz and manual weights to total 100; manual weight defaults to zero. Only released marks enter the provisional gradebook.

Academic progress shows activity, attendance and released assignment trends. Heads and administrators also see department averages; staff see authorized instructor workloads. Charts have accessible data tables. Learning insights includes a distribution based on each learner/course pair's latest stored estimate and displays version, observations and experimental warnings.

Institute administrators can update the institute name, terminology metadata and numeric pass threshold from Institute settings. Terminology controls academic labels across navigation, tables, forms and filters; grading rules also configure grade bands, repeat attempts and missing categories.

## Student

My courses contains active enrollments. Open lessons and mark completion; download authorized materials. Assignments accepts a written answer and/or approved file. A late deadline is enforced by server time. Resubmission works only when permitted and before grading. My submissions shows feedback after release.

Start or resume a quiz inside its availability window. The timer shows the server deadline; save answers regularly. Submitting after expiry finalizes only previously saved answers. Result visibility is controlled by your teacher. Gradebook shows provisional released assessment averages and recorded progress. Attendance, timetable, announcements and notifications are scoped to your learning context. Profile & security allows name and password changes.


## New administration and reporting workflows

- **Super Admin:** open Platform overview without leaving the selected institute. Choose an institute to inspect counts and administrator memberships, then use Open institute people management to invite, link or update people. Platform settings controls the public name, support email and login notice; changes are audited. Infrastructure secrets stay in deployment configuration.
- **Institute Admin:** Institute settings now includes all singular/plural academic labels, optional descending grade bands and points, repeated-quiz attempt selection, missing-category behavior and pass threshold. Changes apply immediately to provisional results and future exports. They do not rewrite stored prediction features.
- **Admin/Head:** dashboard shortcuts open People, instructor assignments, enrollment and progress. People filters combine role, status and academic unit within your authorized scope.
- **Teacher:** dashboard shortcuts lead to submissions, attendance and the question bank. Learning insights searches/pages enrolled learner-course pairs and pages saved estimate history. Estimates remain experimental and must not determine academic access or grades.
- **All roles:** Gradebook supports learner/course search, academic unit, term and active/archive filters with page controls. Students remain restricted to their own enrollments. Staff CSV export includes all matching rows, not only the current page.

Academic scheduling now compares overlapping academic terms; reusing a room/time in a separate term is allowed. Assigning an instructor to an existing offering rejects conflicts with that instructor's other timetable entries. Calendar changes revalidate existing conflicts and schedule writes serialize per institute; PostgreSQL concurrency tests passed.


### Finding records in large forms

Course, learner, instructor and other linked-record fields show one page of choices at a time. Use the search box below a selector or its Previous/Next buttons to find another record. Selected records remain visible when you change the search or page; multi-select fields keep previous selections (Ctrl/Command selects more than one). The question-bank copy form uses the same destination quiz picker.

Super Admin can open Platform audit without choosing an institute to review platform account/configuration changes. Search and filter by action or record type. Institute-specific events remain under Audit history inside the selected institute. Academic progress now includes searchable, paginated instructor workload for staff; teachers see their own assigned workload.

Attendance history now identifies the course, meeting and session date beside the recorded status. Report filters, institute choices and account-linking unit choices also support bounded search/pagination for large directories.


## Assessment and invitation recovery

Quiz drafts stay in the current page while a background refresh or failed save occurs. Save regularly; navigating away or reloading discards unsaved work. Edits entered during a save remain marked unsaved and need another save. Submission temporarily disables editing. The server deadline still decides whether answers can be accepted.

Students can open Grades → Manual assessment grades, then Review, to read released marks and instructor feedback. Instructors can enter fractional manual marks and reopen quiz grading to see previously saved short-answer marks, including zero. Leaving an ungraded question blank keeps it pending; clearing an existing input does not delete its stored mark.

A successful invitation/import confirms account creation, not inbox delivery. If an email fails to arrive, use Forgot password on the login page after confirming the configured mail service works. Administrators should inspect delivery-failure logs; do not re-import or recreate an existing account. Email delivery is attempted after the database transaction commits, and a failed message does not prevent later CSV invitations from being attempted. There is no background retry queue.

Department heads can select existing course/program/section definitions in their own assigned unit before the first offering exists. Institute Admins still create and edit academic definitions. In a course, use Left/Right arrows, Home and End to switch content tabs with the keyboard.
