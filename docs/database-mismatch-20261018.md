# Database mismatch and invitation investigation — 18 October 2026

## Outcome and approval boundary

Normal local startup now rejects configuration drift and duplicate development backends. The application is running against `postgresql:127.0.0.1:5432/intellilms_recovered_20261012`, with frontend `http://127.0.0.1:5174` proxying to backend port 8000. **Both databases still contain unique working data; neither is a complete superset.** Following explicit user approval, the minimal 25-row target recovery was committed and verified. The reported account now exists in PostgreSQL with its original identity and history. No existing records were overwritten, passwords changed, live migrations applied or real emails transmitted.

Gmail TLS/authentication succeeded with the existing credentials using the handshake-only diagnostic. This establishes connection/authentication, **not SMTP message acceptance or inbox delivery**. The recovered target is now available to its Institute Admin in the PostgreSQL application. Sending a real invitation still requires separate approval.

## Approved target recovery

The user explicitly approved `target-account-recovery-proposal.json`: exactly 25 additions, no existing-row changes and no emails. Before execution, verified its SHA-256 (`20fc4faab04c99ad2e0779ca30cf784cf862e531bcec1d39584bbc0385c9f7fb`), the backup manifest, both live datasets and `.env`; they still matched the reviewed state. The existing verified backups were reused.

First applied the exact 25-record subset to a fresh isolated PostgreSQL restore and verified it. Then applied that same subset to the existing live PostgreSQL database in one transaction, holding bounded write-conflicting table locks and a read-only SQLite transaction. Original IDs, every field value, timestamps, unusable password, invitation version and audit details were preserved. No account creation or invitation service was invoked and no commit callback was queued. Only the affected invitation sequence was advanced from next value 3 to 4 with transactional `ALTER SEQUENCE ... RESTART`; it was not rewound.

| Added records | Count |
|---|---:|
| Original user | 1 |
| Original department/unit | 1 |
| Original Head membership | 1 |
| Original invitation | 1 |
| All associated audit events | 21 |
| **Total** | **25** |

Full before/after model comparison passed: every inserted field equals SQLite; all pre-existing PostgreSQL rows and migration names remain unchanged. SQLite and `.env` remain unchanged. PostgreSQL now contains **49 users, 48 memberships, four units, three invitations and 66 audit records**. The diagnostic finds exactly one matching active account with pending setup and the original failed-email evidence. Its password remains unusable until the user completes a valid setup link.

Read-only real-viewset checks passed in the isolated rehearsal and live database: correct Institute Admin 200; foreign Institute Admin 404; forged institute selection 403; a different department's Head 404; anonymous 403. These checks created no login sessions or database changes. Django system check, backend readiness and frontend-proxied health also passed. No application source or frontend code changed in this recovery step; preceding broad test results below remain historical rather than newly rerun tests.

SMTP, SMTP-over-SSL and the password-email sender were guarded during recovery: **zero mail calls**. No live message submission or inbox claim is made. In the verified backup directory, `target-recovery-trial-result.json`, `target-recovery-live-result.json`, `postgres.after-target.private.json` and `recover_approved_target.py` preserve the exact result, post-recovery snapshot and operation. The SHA-256 manifest includes these artifacts. The script refuses changed source/destination snapshots or an altered proposal, and will refuse to rerun over the already imported IDs.

**Remaining scope:** 38 of the original 63 additive candidates and all 21 conflicts were left untouched. Broader reconciliation requires separate approval. The account's invitation was preserved, not resent; a live email requires separate explicit approval.

## Verified cause

Before the interruption, three Django process trees for this checkout targeted port 8000. The tree rooted at PID 18456 inherited `DB_ENGINE=sqlite`; its serving child 21048 inherited the console email backend and a sender different from root configuration. Trees rooted at 24840 and 5096 used PostgreSQL/SMTP; their inspected SMTP overrides matched the root configuration. The port owner at that inspection was PostgreSQL child 7164. These are historical PIDs, not instructions to terminate processes.

`load_dotenv()` used normal environment-first precedence. The startup script set SQLite when requested but never cleared stale overrides or detected disagreement with `.env`. Multiple reload parents could therefore keep different databases/mail settings alive. The browser's proxy and a newly launched diagnostic did not necessarily reach the same dataset. The preserved SQLite invitation currently records `failed`; the console backend is intentionally rejected by the previous security fix because it cannot deliver mail and would expose setup tokens in logs. Historical `sent` records are not SMTP evidence.

On resumption, the old development processes were already absent and the existing PostgreSQL container was stopped. Inspected container identity/volume, then started **the same** `newproject-db-1` container and `newproject_database` volume; neither was recreated. Started one fresh backend tree and one frontend. Startup logs identify PostgreSQL/SMTP/root configuration and port 5174. Direct readiness and proxied health requests returned success. A deliberate duplicate backend launch failed with the new ownership error.

## Preservation and recoverability

Verified private backup directory:

`C:\Users\Luveabid\Documents\IntelliLMS-backups\database-split-20261018-161401`

- Consistent SQLite backup from a read-only source connection; `integrity_check=ok` and no foreign-key violations.
- PostgreSQL custom-format dump using an exported repeatable-read snapshot. Restored into a newly created verification database and compared every concrete/automatic model row and migration name against that snapshot: identical. Removed only the newly created verification database afterward.
- Exact private normalized record snapshots for both engines, original `.env`, SHA-256 manifest, initial process evidence and the investigation scripts. Private snapshots retain original IDs, password hashes, invitation versions, relations and audit history; do not commit or publish them.
- The trial reconciliation restored the PostgreSQL dump into another new isolated database. All proposed inserts were rolled back; only that new trial database was removed afterward.
- Final read-only comparison against both snapshots: **every model row and migration name unchanged**, PostgreSQL 48 users / SQLite 49 users. Root `.env` SHA-256 also unchanged. No original database or data file was removed or reset.

The backups are local. Off-host storage and disaster recovery are separate operational tasks. An initial incomplete snapshot-export attempt is not used as verification evidence; the directory above is the fully verified backup.

## Dataset comparison

This table records the **pre-recovery** comparison. Post-recovery counts are above. Counts include active and historical records. Role counts are memberships, not unique people; each database has one superuser.

| Record | PostgreSQL | SQLite |
|---|---:|---:|
| Users | 48 | 49 |
| Institutes | 4 | 4 |
| Institute Admin memberships | 4 | 4 |
| Department Head memberships | 3 | 4 |
| Teacher memberships | 4 | 4 |
| Student memberships | 36 | 36 |
| All memberships | 47 | 48 |
| Departments/units | 3 | 4 |
| Programs | 3 | 4 |
| Admission batches | 0 | 1 |
| Years / terms / sections | 3 / 3 / 3 | 3 / 3 / 3 |
| Course definitions | 10 | 11 |
| Course offerings | 10 | 10 |
| Teacher appointments / offering-teacher links | 4 / 9 | 4 / 9 |
| Enrollments | 108 | 108 |
| Attendance sessions / records | 45 / 540 | 45 / 540 |
| Assignments / submissions | 27 / 217 | 27 / 216 |
| Quizzes / attempts | 10 / 101 | 10 / 101 |
| Manual grades | 0 | 0 |
| Invitations | 2 | 3 |
| Notifications | 60 | 42 |
| Audit / activity | 45 / 466 | 63 / 465 |
| Predictions / analysis runs / analysis items | 17 / 6 / 69 | 17 / 6 / 69 |

Equal counts do not establish equality. Three attendance statuses and one quiz attempt's marks differ. Teacher assignments, one course's active flag, one enrollment's active flag and one timetable differ. Both stores independently created an institute with the same unique code but different UUIDs, and accounts with the same unique email but different UUIDs. Invitation primary key 2 points to different accounts. These cannot be blindly imported or overwritten.

At initial inspection, recipient UUID `038b46dd-4188-4934-9aa1-6b9381901101` existed only in SQLite. It is active, has no usable password, and has an unaccepted, failed invitation. Its Head membership is `2883d0a5-ed12-4175-ac7f-d2e0b682a029`, unit `e70f5702-eda6-4c50-bafd-ee6658b7f428`, invitation primary key 3. These exact records and their 21 audits have now been recovered into PostgreSQL with approval. No replacement identities were created.

## Exact dry-run reconciliation

Private detailed files in the verified backup directory:

- `reconciliation-dry-run.json`: exact per-model IDs present only on either side and all differing field names.
- `reconciliation-verified-plan.json`: **every source record's proposed action**, destination-only preservation, dependencies and PostgreSQL constraint failures. It contains IDs/field names rather than passwords, invitation versions or session keys.
- `postgres.records.private.json` / `sqlite.records.private.json`: protected original values for a reviewer, including audit/history evidence. Never paste these into logs.

The conservative proposal considers SQLite additions into the currently serving PostgreSQL database:

| Action | Count | Meaning |
|---|---:|---|
| Insert candidates verified in isolated restore | 63 | Original IDs and values accepted by PostgreSQL constraints/FKs; rolled back |
| Update existing records | **0** | No automatic source-wins or last-write-wins policy |
| Skip source records | 2,358 | Equivalent content/relationships, framework natural-key rows, or deliberately excluded sessions |
| Hold conflicts | 21 | Existing-field differences, unique collisions or blocked dependencies |
| Retain PostgreSQL-only records | 67 | No deletion or replacement |

The 63 additions comprise one user, membership, invitation, unit, program, course and batch; six notifications; one correction request; 37 audit records; one analysis run and 11 analysis items. Constraint acceptance alone does not approve the historical/business meaning of a merge. Audit details may refer to actions on records whose conflicts remain held.

The 21 holds comprise five login timestamps, one duplicate-email account, one duplicate-code institute and dependent membership/audit, one colliding teacher appointment, two teacher join-table identities, invitation 2, one Django admin log entry, one course flag, one enrollment flag, one timetable, one quiz attempt and three attendance records. The plan lists their exact keys and changed fields. Selecting a winner for academic changes or consolidating duplicate identities requires an explicit policy; preserving both conflicting numeric primary keys within one table is impossible without approved identity mapping/provenance.

Most other timestamp differences are the prior export's truncation from microseconds to milliseconds. These are identified explicitly and skipped, not silently written back. Equivalent many-to-many relations are matched by their relationship columns, preserving destination join-row identities. Content types/permissions must map by natural keys; sessions are never imported. The original exact values remain in both backups.

**Approval status:** the **25-row target proposal** was approved and completed as described above. Its exact keys remain in `target-account-recovery-proposal.json` beside the original 63-candidate plan. The remaining 38 candidates and 21 conflicts require a separately reviewed scope/policy. Any subsequent import must recheck current snapshots under a write freeze, retain IDs/relationships, validate tenant consistency, preserve audit payloads and adjust only affected sequences. No general-purpose live merge command has been added. A separate explicit approval is needed for a live invitation email.

## Implemented changes

| File | Change |
|---|---|
| [config/environment.py](../backend/config/environment.py) | Root configuration drift detection without printing values; strict engine selection; explicit isolated SQLite/deployment modes; safe database identity |
| [config/settings.py](../backend/config/settings.py) | Uses guard; exposes explicit SSL option; orders staticfiles after application command so the runserver guard takes precedence |
| [config/server_lock.py](../backend/config/server_lock.py) | OS-held per-checkout/port lock released automatically on exit/crash |
| [management/commands/runserver.py](../backend/apps/accounts/management/commands/runserver.py) | Duplicate startup denial, database/mail/frontend/PID startup diagnostic; prevents SQLite on normal port 8000 |
| [start-backend.ps1](../scripts/start-backend.ps1), [setup-local.ps1](../scripts/setup-local.ps1) | Separate named SQLite evaluation database, local test mail, separate port, propagated startup errors |
| [mail_diagnostics.py](../backend/apps/accounts/mail_diagnostics.py), [auth.py](../backend/apps/accounts/auth.py) | Safe authentication/TLS/timeout/recipient/sender/provider failure categories; no provider exception body or credential logging |
| [check_invitation_delivery.py](../backend/apps/accounts/management/commands/check_invitation_delivery.py) | Safe database identity and mail transport details, unavailable-database error, optional handshake-only SMTP probe |
| [vite.config.ts](../frontend/vite.config.ts) | Normal frontend port follows root `FRONTEND_URL`; refuses occupied port; retains existing explicit API-target override for isolated tests |
| [test_configuration_guard.py](../backend/tests/test_configuration_guard.py) | Configuration conflicts, no fallback, deployment/test/evaluation paths, process lock, no-send probes, safe failure and port protections |

README, implementation progress, limitations and the preceding invitation report document this continuation. Existing invitation UI, role permissions, tenancy rules, academic workflows and application data are preserved. The previous invitation implementation and its tests were reviewed and reused, not rewritten. Other pre-existing Git changes were retained.

## Operation and SMTP evidence

```powershell
# Normal local operation: same existing root .env for commands and API.
.\.venv\Scripts\python.exe backend/manage.py check_invitation_delivery --email '<recipient-email>'
powershell -ExecutionPolicy Bypass -File scripts/start-backend.ps1
# Second terminal: normal port is read from FRONTEND_URL, currently 5174.
npm.cmd --prefix frontend run dev

# Optional connection/TLS/authentication check only; NO email is submitted.
.\.venv\Scripts\python.exe backend/manage.py check_invitation_delivery --probe-smtp
```

Conflicting inherited values now cause a startup error listing variable **names only**. Use a fresh terminal or clear those named overrides. Do not replace `.env` or credentials. `INTELLILMS_CONFIG_SOURCE=environment` is an explicit opt-in for intentional externally configured deployments/benchmarks; it is not the normal local workaround. Pytest and guarded browser settings retain isolation. There is no PostgreSQL-to-SQLite fallback.

Observed SMTP: `smtp.gmail.com:587`, STARTTLS true, implicit SSL false, 30-second timeout, credentials configured, sender matches authenticated account. The handshake-only command succeeded. It calls SMTP open/close, never send, MAIL FROM, RCPT TO or DATA. Existing credentials were not changed. Per [Google's SMTP settings](https://support.google.com/mail/answer/7104828?hl=en), port 587 uses TLS/STARTTLS. [Google App Password guidance](https://support.google.com/accounts/answer/185833?hl=en) requires 2-Step Verification and notes that changing the Google password revokes App Passwords. Successful authentication here does not justify replacing working credentials or prove recipient delivery.

The previous distinction among pending, SMTP accepted, failed, local capture and historical unknown transport remains. Setup expiry, rotation, replay denial, usable-password protection, commit safety, retry and authorization behavior remain under test. No live SMTP acceptance or inbox claim is made.

## Verification

- Backups, isolated PostgreSQL restore equality, dry-run constraint checks and final live-data/configuration preservation checks passed.
- Django check and migration drift passed. Both existing databases have the same migration state and the choice-only `accounts.0009_invitation_delivery_evidence` remains unapplied there. No application schema changes are required by this continuation; isolated tests apply the existing migration normally.
- Full isolated PostgreSQL checkpoint: **230 passed, 329.07 seconds**, no failures/errors/skips. A fast password hasher was set only inside this test process; application hashing was unchanged.
- Frontend: **66 passed**, TypeScript check and production build passed. Existing large-bundle advisory remains. No invitation or academic UI component was changed.
- Final targeted PostgreSQL follow-up: **44 passed (40.12s)**, including 27 configuration/SMTP-diagnostic cases and 17 invitation cases. It includes tests added after the 230-case full checkpoint; counts overlap and are not additive. A final 27-case configuration rerun verifies lock-key normalization after that follow-up.
- Selected Chromium invitation/admission/CSV/grade-release/security workflows: **4 passed (4.1m)**. Covers failed-send feedback, retry, expiry, token replacement, activation, replay/reset/deactivation. Browser mail is captured in a local isolated mailbox; ports 6174/8101 and a fresh guarded database keep live data separate. Browser tests use normal application password hashing.
- A new regression initially exposed Django's command precedence selecting staticfiles' runserver; app order was corrected and the guard retest passed. A database diagnostic encountered the stopped existing container; it was restarted in place and the diagnostic subsequently succeeded. These are fixed findings, not unreported successful attempts.

Local evidence: `backend/database-repair-regression.log`, `backend/test-results/database-repair-regression.xml`, `backend/database-repair-followup.log`, `frontend/database-repair-vitest.log`, `frontend/database-repair-browser.log`, `backend/test-results/database-preservation-final.json`, and startup logs under `backend/test-results/`. These are ignored verification artifacts. Full browser regression, public production acceptance and inbox delivery are not claimed.

## Final recovery and invitation verification — 19 October 2026

- [x] Reverified the approved 25 rows against their original SQLite fields and all current PostgreSQL model rows/migration names against `postgres.after-target.private.json`. PostgreSQL has 49 users, 48 memberships, four units, three invitations and 66 audits. All 20 backup-manifest files verified; SQLite and root `.env` remain unchanged. No recovery was repeated.
- [x] Confirmed one serving backend on port 8000, intended PostgreSQL `intellilms_recovered_20261012`, root-matching SMTP settings, and frontend/proxy on 5174. Readiness, anonymous authentication rejection and CSRF bootstrap passed. Gmail STARTTLS/authentication passed without submitting a message.
- [x] Five recovery-access checks and ten recovered-Head identity/scope checks passed in read-only transactions. The Head sees its own department and no offerings (none exist there), cannot select another institute or enter unauthorized teaching. Its existing unusable password and pending/failed invitation remain intact.
- [x] Existing isolated PostgreSQL suite: **233 passed (243.14s)** with test-process-only fast hashing. Added two college/university recovered-Head regressions: failed delivery, coalesced retry with stable IDs/counts, CSRF, token rotation/replay, real session login and department isolation; **2 passed (11.91s)** with normal hashing. These new cases were collected after the full run.
- [x] Frontend **66 passed (76.92s)**, typecheck/build passed; existing bundle-size advisory remains. Selected Chromium run: **14 passed / one failed** because the school test expected the Classes & Grades heading on the landing page. Updated that test to follow the existing management link; complete school workflow rerun **1 passed (52.3s)**. All 15 selected workflows now have passing evidence, but were not rerun together. No production application code changed in this verification step.
- [x] Prepared a mocked preview of exactly one target invitation without rotating its live token or sending email. Current setup origin is `http://127.0.0.1:5174`; the link must be opened on the hosting computer. Live send, inbox delivery and actual target activation remain unverified and require explicit email approval. The user subsequently requested the Learning Insights investigation; real sending remains paused.
- [ ] Remaining 38 reconciliation candidates / 21 conflicts remain untouched. The choice-only accounts.0009 migration remains unapplied to live stores. No database reset, merge, password change or academic-data edits were performed.

Evidence: `backend/test-results/final-recovery-verification.json`, `final-head-access-preview.json`, `final-serving-processes.json`, `final-invitation-regression.xml`, `final-recovered-head.xml`; test logs named `final-invitation-*` / `final-school-browser.log` are ignored local artifacts. Initial broad secret scanning also matched existing public development defaults in `.env.example` and Docker Compose; these are pre-existing local-development settings, not newly exposed SMTP credentials, and still require production replacement.


### Later read-only observation — 19 October 2026

During the subsequent Learning Insights task, the final comparison found separate live activity after the exact-recovery verification: accounts.0009 has been applied; invitation 3 was resent at 18 October 2026 16:27:08 UTC, has one corresponding audit and now records SMTP acceptance. Setup remains unaccepted. One existing user's last-login value and two new sessions also differ. This agent did not perform the resend/migration in this work. They were preserved without rollback. Academic rows, all 17 predictions, SQLite, root `.env` and model artifacts remain unchanged. The earlier pending/failed/unapplied statuses are historical checkpoints, not the latest state. Inbox delivery is not verified. See [Learning Insights final verification](learning-insights-20261019.md#final-preservation-and-concurrent-activity).
