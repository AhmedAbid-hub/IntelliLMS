# Permission matrix

| Capability | Super Admin | Institute Admin | Department Head | Teacher | Student |
|---|---|---|---|---|---|
| Create/deactivate institutes | Global | No | No | No | No |
| Select institute | Any active | Active memberships | Active memberships | Active memberships | Active memberships |
| Academic structure writes | No | Own institute | No | No | No |
| Create/link members | Institute Admin accounts only | New users in own institute | No | No | No |
| Link an existing global account | Administrative accounts only | No | No | No | No |
| Offerings and enrollment writes | No | Own institute | Teacher assignments and department enrollment only | No | No |
| Course content / assessment writes | No | No routine teaching | Assigned offerings in Teaching workspace | Assigned offerings | No |
| Submit work / complete lessons | No | No | No | No | Enrolled offerings, self |
| Grade / mark attendance | No | Oversight/finalization/corrections only | Assigned offerings in Teaching workspace | Assigned offerings | No |
| Student results | Aggregate institute totals only | Own institute | Department offerings | Assigned offerings | Own released results |
| Announcements | No academic access | Institute/department/course | Own department | Assigned course | Read audience only |
| Predictions | Model operational status only | Own institute | Department offerings | Assigned offerings | No |
| Audit | Platform audit only | Own institute | No | No | No |
| Notification inbox | Own | Own | Own | Own | Own |

Inactive institutes and memberships cannot be used. Head scope covers one explicitly assigned academic unit, not its descendants. Teachers do not gain department-wide access. Super Admin is created through `createsuperuser`, explicit local demo seeding, or trusted Django administration; public registration does not exist.

The API is the authorization boundary. Navigation hides role-inappropriate actions but direct URL access never grants permissions. Metadata reads such as years/terms are institute-wide; personal student data is narrowed by offering and ownership.


Head academic-definition reads include all courses and programs in their assigned unit and sections under those programs, even before offerings exist. This enables the existing authorized first-offering workflow. Other-unit and other-tenant definitions remain hidden, and academic-definition writes remain restricted to Institute Admin.

## Upgrade permissions (12 October 2026)

- Platform accounts cannot access academic CRUD, individual grades, teaching activity, question banks or learner predictions through the LMS API. Selecting an institute grants account-administration context, not academic access. Platform account management and aggregate institute/administrator details remain authorized. No implicit support bypass is available. Trusted Django administration/ORM operations remain privileged deployment operations outside this API permission matrix.
- Department Heads assign active teachers within their department. Institute Admin changes to instructor lists require an explicit administrative override reason; both previous and new teacher IDs, actor and override status are audited. Staff lifecycle reassignments are audited with the membership transition reason. Changing an archived course's instructors is rejected.
- Institute Admin manages non-admin memberships, head replacement and student enrollment in their institute. Only Super Admin appoints/replaces Institute Admins. Self-membership changes and removal/deactivation of the last active admin are rejected, including global account deactivation. Lifecycle removal preserves membership/history, withdraws student enrollments and requires reassignment of active teaching. Reinstatement does not silently restore withdrawn assignments/enrollments.
- Bulk enrollment is limited to 100 selected active students per request and is atomic. Head selection is additionally department-scoped. Question batches/bank selections are limited to 100; quizzes imported/duplicated through bulk tools are bounded at 500 questions. Attempts lock question editing and ordering. Quiz duplication never copies attempts, grades or release/publication state.
- Account CSV import is limited to 500 rows / 1 MB and teacher/student roles. Preview writes no users or invitations. Student identifiers and section relationships are validated in the active institute, including duplicates within a batch.

**Current governance (15 October):** routine academic writes require an assigned instructor, with a teaching Head in the Teaching workspace. Admin has oversight, reasoned finalization/reopening and independent correction/emergency workflows. A Head may review an independent own-unit correction only when the course explicitly delegates review. There is no implicit platform support-access bypass.

## Class analysis, profile and agenda permissions

- `/class-analysis/` start and run/detail/items/advance actions require an active Institute Admin, Department Head or assigned Teacher scope. Every request rechecks the course; a formerly assigned teacher cannot continue or read a run after unassignment. Students and platform accounts are denied. Archived courses cannot start/advance analysis. Active student memberships/enrollments are rechecked before each batch.
- `/my-agenda/` is student-only and derives its student/institute/course scope from the session. It accepts no target-student override. Drafts, other institutes, withdrawn enrollments and archived offerings are excluded.
- `/auth/avatar/` and permitted profile preferences are global **self-service** operations, like password changes; they cannot change another account. `/memberships/{id}/avatar/` uses normal scoped membership retrieval. Neither endpoint publishes private media URLs. Anonymous and CSRF-invalid writes are rejected; the filesystem is not a public avatar server.
- The academic notification preference affects future academic inbox updates/reminders only. Correction/support/submission notifications and Head workspace separation are implemented; recipient scope and preferences are rechecked.


Final unified hierarchy: `/teacher-appointments/` is read-only for Institute Admin and supports scoped create/withdraw for the own-department Head. Candidates must have active teaching eligibility authorized by Institute Admin. End-appointment requires reassigned/unassigned courses. Existing assignments are migrated without data loss. Head cannot create offerings or change their non-teacher fields. Curriculum/batches are Institute Admin writes; Head reads own department, students/teachers read programs represented in their authorized course sections. `/institute-setup/` is Institute Admin only.


## Institution types and complete academic history

Schools deny department/batch/Head workflows and permit direct Admin teacher assignment without the departmental override requirement. Colleges use annual study years; universities use semesters and cohorts. Historical roles/structures remain stored but do not bypass type/permission rules.

Admission, transfer, academic progression/repetition/correction/withdrawal/completion/graduation require Institute Admin. Decisions preserve old placements/enrollments/results and audited evidence; the learner sees only their own released historical results. Complete progression-decision evidence and provisional program-wide GPA are limited to the learner and Institute Admin. Teachers and Heads use authorized course reports, not whole-student historical records. Finalized/closed-period records retain explicit correction protections; synthetic predictions never authorize an academic action.


Public-model generation: `POST predictions/`, `POST class-analysis/` and run `advance/` require an assigned instructor (Teacher or a Head in their capability-checked teaching workspace, personally assigned to the course). Institute Admin oversight is read-only; a Head's departmental management scope alone cannot generate estimates. No student risk-label endpoint is enabled. Public dataset training does not grant access to LMS records; per-institute/course scope and active student membership remain required. Model results never authorize grade/progression changes.
