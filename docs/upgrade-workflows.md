# Upgrade workflow guide

These workflows extend the existing application. The complete upgrade checklist remains in IMPLEMENTATION_PROGRESS.md.

## Staff lifecycle

In People, Institute Admin opens **Manage access** beside a member. Review active course/enrollment consequences, choose an operation, supply the required replacement and a reason, then confirm. A departing teacher's active offerings must be reassigned; archived records, submissions, marks and attendance survive. Removal disables this membership, not the person's other institutes or global account. Student deactivation/removal withdraws active enrollments. Reactivating a membership does not silently restore those enrollments.

**Replace Department Head** chooses another active teacher in the same department. The outgoing head can become a teacher, be deactivated or be removed. The replacement retains teaching eligibility. The Institute Admin cannot edit their own membership or appoint an Institute Admin; platform account administration handles that role. The last active Institute Admin cannot be removed or globally disabled.

One replacement currently covers all affected active offerings. For cross-department teaching, explicitly resolve assignments per offering before removing the departing staff member.

## Teacher assignments

Department Heads use department course creation/editing to assign eligible teachers. Institute Admin sees no ordinary instructor selector until selecting **Use administrative teaching-assignment override**. An override requires a reason and records old/new teacher IDs. Both paths validate tenant, head department, active teaching membership and timetable conflicts. Archived course assignments are locked until unarchived.

## Students and enrollment

Add a person as student with optional institute display name, student identifier and class/section. A section's program must belong to the selected department. **Import CSV** provides a template, preview, row errors and error download. Required columns are username,email,role; optional first_name,unit (exact department name),display_name,student_identifier,section (UUID). Preview creates no users/mail. Commit validates the whole batch again; at most 500 rows and 1 MB are accepted. Existing accounts are never overwritten.

On a course card or the course overview, **Enroll students** opens server-searched pages of eligible students. Select up to 100 across pages, choose enroll/withdraw/reactivate and provide a reason. Already-enrolled/withdrawn status is shown. One invalid selection rejects the whole request. Repeated identical changes are harmless. Withdrawals retain history.

## Course workspace

Staff opens a course for overview and creation shortcuts, lessons, materials, assignments, quizzes, modules, students, attendance, grades, class performance and experimental AI insights. The embedded gradebook/export and trends/prediction summaries remain bound to that course. Existing student lesson/material/quiz workflows are preserved. Active AI estimates use external public OULAD assessment data and remain experimental, not validated educational decisions. Existing synthetic history keeps its original label; see ml-methodology.md.

## Quiz authoring

Use **Quiz authoring** beside a quiz. The bulk editor saves 1–100 rows atomically. MCQ choices must be unique non-empty strings and the answer must match one choice; Boolean answers are `true`/`false`; short answers require manual grading. Positive marks are required.

Download the CSV template and upload UTF-8 CSV (1 MB maximum); options use JSON arrays. **Preview CSV** loads editable rows without saving. Errors identify the data row (header excluded). The bank tab provides server search/type filtering/pagination and selection across pages. Imported questions are independent copies.

**Question order** provides keyboard-accessible move buttons and validates every current question exactly once. Once an attempt exists, question changes/order are blocked. **Duplicate quiz** creates an unpublished/unreleased draft with the same questions/settings; it never copies student attempts or marks. Review dates before publishing. XLSX import is not implemented.

## Academic structure and terminology

The structure page groups departments/programs, years/terms, classes/sections and course catalog. Courses & Enrollments links to daily teaching operations. Institute Settings offers University/College/School terminology presets and a collapsed Advanced terminology section. Applying a preset edits the form only; saving preserves the academic records and institute type.

## Analyze a class

In a course's **AI insights** tab, choose **Analyze class**. On the general insights page, first select an authorized active course. The server snapshots active student candidates, processes at most ten per request, and saves each result. **Pause after current batch** stops further requests. Returning to the same course and clicking Analyze Class resumes its active run. Concurrent starts share one active run.

The table separates recorded attendance, assignment submission, quiz score, released grade and lesson completion from experimental probability/category. Search and pagination stay server-side. Missing observations, unavailable models, withdrawn students and individual failures are explicit results; they do not fabricate predictions or discard successful classmates. After completion, running again retries failures and reuses unchanged successful model/input results. The original prediction timestamp is preserved. No background processing continues after the browser stops sending requests, no risk alert is sent to a student, and no academic standing changes.

## Profile pictures and notifications

All roles can use Profile & Security to upload, replace or remove a profile picture, edit their permitted name, change their password and choose whether to receive future academic inbox notifications/deadline reminders. The picture is optional; initials remain the fallback. JPEG, PNG and WebP uploads are limited to 4 MB and 4 million pixels, decoded, cropped to 256px JPEG and stripped of metadata. Source bytes and original names are never served. Pictures appear in navigation/profile and authorized membership rosters. Downloads require a current session and the roster's tenant/role scope. Password/security emails are not muted by the academic preference.

## Student priorities

The student dashboard and personal progress page show pending assignment/quiz counts and a bounded list of upcoming and missed deadlines. A task disappears after the student's own submission or completed attempt; classmates' work does not affect it. Closed quizzes and assignments that disallow late work suggest contacting the teacher. Open/late-allowed work links to its filtered course list. Dashboard guidance uses actual recorded lesson completion and released scores, with missing-data explanations and rounded percentages. It does not use experimental risk labels. Existing grade/attendance/progress pages remain available for complete records.
