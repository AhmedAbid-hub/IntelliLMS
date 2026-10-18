# User guides

## Super Admin

Sign in with a platform account. Platform overview and Institutes show institution counts and status. Create an institute with its correct school/college/university type, then invite its Institute Admin. Platform accounts exposes only administrative accounts; link an existing administrator to the selected institute when needed. Account deactivation is guarded against disabling yourself, a platform administrator or the last active institute administrator. Platform audit records global administrative events. Selecting an institute does not grant teaching, ordinary learner-account access or individual academic results.

## Institute Admin

Select your institute and open Institute setup or Academic structure. Create the type-appropriate years, classes/programs, sections and subjects, then offerings. Schools assign teachers directly; college/university Heads normally own department assignments, with a reasoned Admin override when necessary. Invite staff, admit students with reviewed placement/enrollment, or preview a CSV import. Use People actions for consequence-reviewed role/status/removal changes and reassignment. Review grades/attendance and use the audited approval/correction workflows; administration alone does not authorize ordinary teaching or grade entry.

CSV headers are `username,email,role,first_name,unit`. Role is student or teacher; unit is an exact institute unit name. A duplicate account or invalid row rejects the whole import. Download the error CSV, correct the source, and retry. Existing accounts are not overwritten.

## Department Head

This workspace is available only where departments exist. Your membership must identify your department. In Department management, appoint Admin-authorized eligible teachers, assign them to existing department offerings, and manage permitted enrollment. Review department reports and announcements. Institute Admin creates academic definitions and offerings. Independent corrections require explicit delegation on the affected course. If you have teaching capability and an assigned course, switch to My teaching for instructor actions; department oversight alone does not grant those actions. Withdrawn appointments or assignments revoke teaching access immediately.

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

- **Super Admin:** open Platform overview without leaving the selected institute. Choose an institute to inspect counts and administrator memberships, then use administrator management to invite, link or update administrative accounts. Platform settings controls the public name, support email and login notice; changes are audited. Infrastructure secrets stay in deployment configuration.
- **Institute Admin:** Institute settings now includes all singular/plural academic labels, optional descending grade bands and points, repeated-quiz attempt selection, missing-category behavior and pass threshold. Changes apply immediately to provisional results and future exports. They do not rewrite stored prediction features.
- **Admin/Head:** dashboard shortcuts open People, instructor assignments, enrollment and progress. People filters combine role, status and academic unit within your authorized scope.
- **Teacher:** dashboard shortcuts lead to submissions, attendance and the question bank. Learning insights searches/pages enrolled learner-course pairs and pages saved estimate history. Estimates remain experimental and must not determine academic access or grades.
- **Academic roles:** Gradebook supports learner/course search and institution-aware year/class/program/section/subject/period/study-year/batch and active/archive filters with page controls. Students remain restricted to their own enrollments. Staff CSV export includes all matching rows, not only the current page.

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


## Institution setup and academic progression (15 October 2026)

Create an institute with its correct type; existing types cannot be silently converted. Schools use Academic years → Classes/grades → Sections → Subjects and direct administrator teacher assignment. Colleges default to two annual study years and support a different configured program duration. Universities use programs, batches and configurable semesters. Setup, dashboards, forms and report filters adapt to the chosen type.

For admission, choose the academic year, class/program, section and study-year/semester stage. Choose the period and eligible offerings. Review the preview before creating the account. Existing learners use People → Placement to inspect their current record and history. Transfer preserves previous placements; explicitly withdraw any overlapping delivery before choosing its replacement.

Use **Review academic decision** in the placement view for progression, repetition, correction, withdrawal, completion or graduation. Enter a reason and next placement when applicable. Preview the released evidence, check the review acknowledgement, then confirm. If grades or placement changed, review again. A required-pass policy blocks progression/completion until all required mapped subjects have released passing results; the default manual-review policy requires the administrator's decision. ML estimates never decide progression.

Students use **Academic history** for released results from previous enrollments and their recorded decisions. Ending an enrollment removes course-content access without removing released historical results. Admins can inspect decision evidence and university program totals from Placement. Teachers/Heads retain course-scoped progress reports.

University GPA/CGPA is disabled initially. In Institute settings, configure grade bands/points, select an explicit credit-weighted repeat policy (all, latest released, or best released), and give the policy-change reason. Configure positive credits on each subject through Academic structure. Results show separate program totals, semester GPA, credits and excluded records. They are provisional and use current rules/credits, not an immutable official transcript. Schools/colleges do not acquire GPA by default.

Academic progress, grade reports, comparisons and learning insights expose appropriate academic filters. College study-year filtering uses recorded placement stages. Instructor search changes which instructors are listed, not how many learners they teach. Historical unknown stages are not guessed.

Close a period to prevent ordinary teaching/enrollment writes while preserving read access and authorized correction workflows. New attendance dates must lie inside the course period; calendar edits cannot exclude recorded sessions. To change academic identity, create the appropriate new record and use reviewed placement/enrollment workflows rather than moving past assessments into another period.


## Public-data learning estimates

An assigned teacher opens a course → **AI insights** → **Analyze class**. The existing bounded analysis shows recorded attendance, submissions, quiz/grade/progress indicators alongside a separate estimate. **Prediction basis** explains the dataset, target, measured external evaluation and the two actual assignment inputs. **Generate estimate** supports one selected learner; **Recent estimates → Details** retains the original model warning and source even after a model changes.

The public model predicts a score below 40% on the next submitted assignment. It requires two released assignments with distinct past deadlines and an upcoming published, unsubmitted assignment; otherwise a precise insufficient-data explanation appears. Quiz scores, attendance or clicks cannot replace missing assignments. OULAD's 40% threshold does not replace your institute's grading rules. The model misses many low-score outcomes and also produces false alarms; use recorded work and human discussion to decide supportive action. It never decides grades, penalties or progression.

Historical synthetic estimates remain explicitly labeled. No live demo dates or marks were rewritten. For a reproducible demonstration with fictional accounts and compatible past deadlines, follow the isolated [browser demonstration](ml-methodology.md#reproduce-training-and-the-demonstration).
