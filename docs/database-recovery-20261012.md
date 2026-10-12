# Database recovery and teacher dropdown — 12 October 2026

## Confirmed causes

The original working application data was in `backend/db.sqlite3`, not either anonymous PostgreSQL volume. The running development server had inherited explicit SQLite configuration, while newly launched management commands read `DB_ENGINE=postgresql` from `.env`. Compose's `newproject_database` volume contained an empty `intellilms` database (zero public tables). Changing the connection host resolved connectivity but did not transfer the application data or create its schema.

The teacher dropdown had an independent rendering defect. With the original database, `GET /api/v1/teacher-appointments/candidates/` returned HTTP 200 and both `khair` (not appointed) and `university.teacher` (already appointed). Khair's active teacher membership had no primary department but did have School of Computing in `eligible_units`; the Head's department matched. That is valid eligibility. The custom dropdown was absolutely positioned inside `.appointment-panel`, whose `overflow: hidden` clipped its options. Browser geometry confirmed the list extended below the card's clipping boundary. No account-specific query changes or permission bypasses were needed.

## Recovery and preservation

- Backups: `C:\Users\Luveabid\Documents\IntelliLMS-backups\database-recovery-20261012`.
- Preserved original SQLite database, verified consistent SQLite backups (`integrity_check=ok`), original environment configuration, private-media ZIP, both old raw volume archives, portable fixtures, PostgreSQL custom dump, verification result and SHA-256 manifest. These contain private data and remain outside the repository.
- Both anonymous volumes were mounted read-only, archived, and copied to task-owned inspection volumes. PostgreSQL recovery ran only on the copies. Both contained role/database `intellilms_test` and no application tables. They are old test clusters, not the missing working database. The failed `postgres`/`intellilms` role logins were caused by using roles that these clusters never contained.
- No local PostgreSQL service or installation was found in the inspected Windows service list/default PostgreSQL install directory. Docker provides the active server.
- Created a **new** PostgreSQL database, `intellilms_recovered_20261012`, in `newproject-db-1` / `newproject_database`. The pre-existing empty `intellilms` database was retained.
- Applied existing migrations to the new destination, imported the SQLite records, then compared all exported model fields and many-to-many relations by model/primary key. **2,126 objects matched**, normalizing equivalent timestamp formatting and unordered many-to-many lists. Django-generated content types/permissions were regenerated; natural foreign keys preserved permission references. Password hashes and identifiers were retained, not reset.
- Final counts: **3 institutes, 47 users, 46 memberships, 3 academic units, 10 offerings, 3 teacher appointments**. All exported academic history, invitations, notifications, sessions and audit records were included. Private media remains in its existing location.
- An initial Windows-default-encoding fixture could not be imported. Re-exported explicitly as UTF-8. No configuration switch occurred until the final verified import succeeded.
- `.env` now selects PostgreSQL, recovered database and `POSTGRES_HOST=127.0.0.1`. The application was restarted against it; the existing Head session continued to work. Default settings and `.env.example` now use the numeric loopback address, with a five-second PostgreSQL connection timeout.
- Only the two newly created `intellilms-inspect-*-20261012` inspection volumes and the temporary in-container dump file were removed. Both original anonymous volumes, the Compose volume, original SQLite data and all recovery backups remain. No demo reseed or application database reset occurred.

## Code repairs and tests

- `frontend/src/styles.css`: appointment creation card permits its options to extend outside the card; table clipping remains unchanged.
- `frontend/src/components/RelationSelect.tsx`: preserve the chosen label before resetting search/page, and allow clearing an optional single selection. These repairs apply generically to all related-record selectors.
- `backend/config/settings.py`, `.env.example`, local `.env`: reliable PostgreSQL host and verified recovery destination.
- `backend/tests/test_teacher_appointments.py`: eligibility without a primary department, inactive membership/account exclusion, valid appointment and preservation of existing teaching assignments; existing tests also cover Admin authorization, cross-tenant and unauthorized-department denials.
- Broader frontend checks exposed a missing Gradebook export and an Auth/feedback import cycle in the current repository. Restored the Gradebook in its own module with course-bound filters, retaining the redesigned Dashboard; split feedback components to remove the cycle. Updated component/browser tests to use the current searchable selectors and explicit attendance choice. No functional assertions were discarded.
- Focused PostgreSQL suite: **8 passed** (`test_teacher_appointments.py`, `test_notifications.py`, `test_admission.py`). Django check and migration drift check passed. Live PostgreSQL candidate endpoint returned Khair and Amina; existing counts were preserved.
- Frontend suite: **43 passed** after fixing the reported failures. Final build/typecheck and the two-browser-case checkpoint are recorded in IMPLEMENTATION_PROGRESS.md.
- Dedicated Chromium appointment test passed at 1280px and 390px: Admin provisions additional eligibility, Head opens actually clickable options, selects/reviews/appoints, and the existing appointment remains. Screenshots: `docs/images/appointment-dropdown-1280.png` and `appointment-dropdown-390.png`.

Khair was left eligible and unappointed in the real application. The successful creation test used a fictional account in the disposable E2E database. No existing account or academic assignment was modified to prove the fix.

## Operation after recovery

Use the normal PostgreSQL startup (`scripts/start-backend.ps1`, without `-SQLite`). The root `.env` points to the recovered database. The preserved SQLite file is now a historical source, not an automatically synchronized database. Do not switch back expecting new PostgreSQL changes to appear there. Recovery backups are local; off-host restore, production mail/TLS and the remaining unified upgrade acceptance criteria remain separate work.
