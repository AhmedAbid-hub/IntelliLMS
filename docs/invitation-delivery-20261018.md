# Invitation delivery investigation and fix — 18 October 2026

## Findings and evidence

The original invitation sender interpreted any truthy Django `send_mail()` result as `email_status="sent"`. Django's console, file and in-memory backends can return 1 without submitting anything to an email provider. The console backend also prints the password-setup link. Consequently, the old “Submitted to mail backend” record never established SMTP acceptance.

Read-only inspection found multiple development backend processes for this checkout with different configuration: an older process had inherited `DB_ENGINE=sqlite` and the console email backend; other processes used PostgreSQL and SMTP. The reported recipient's pending, unusable-password account and legacy `sent` invitation were present in the preserved SQLite file. A fresh process using the root configuration selected PostgreSQL, Gmail SMTP with TLS and frontend port 5174, but found no matching recipient in that selected database. The frontend processes had no custom API proxy override. Credentials were not printed or changed.

This establishes a configuration/data split and a reproducible false-success defect. Historical invitation rows did not store their transport, so they cannot independently prove which process submitted an individual historical message. A successful manual SMTP email from another process does not establish the configuration of the process serving the invitation request. Django loads settings at process startup; inherited environment values take precedence over the root `.env`.

Two further defects were verified in code and regression tests: resend responses were constructed before their `on_commit` callback sent the replacement, and a cached reverse invitation relation could return the preceding status. The dialog ignored the response and always announced a processed request, including after transport failure.

## Implemented behavior

- Account creation, admission and CSV import reserve the invitation in the same transaction as the account. Only the outermost successful commit dispatches email; rollback discards both the invitation and callback.
- The sender locks the user, refuses accounts with an existing usable password or accepted invitation, checks active membership/institute, and coalesces duplicate initial/queued sends. An explicit resend rotates the signed version. An abandoned pending send becomes retryable after `EMAIL_TIMEOUT + 30` seconds.
- Dispatch rechecks the version and account state under the user lock. Repeated callbacks cannot send the same version twice. SMTP runs after the original account transaction commits, with the configured transport timeout.
- Invitations use `FRONTEND_URL` with a normalized trailing slash, the stored recipient address, a 48-hour signed token and the existing password-confirm flow. Accepted, replaced, expired and revoked invitations cannot activate the account.
- SMTP acceptance, local test capture, failure and unknown historical transport are distinct. Console/dummy/unsupported transports fail without printing the setup link. SMTP and other transport exceptions are caught, logged by account UUID and exception class only, and persisted as failure; exception bodies, recipient addresses, passwords and tokens are omitted.
- Resend reads fresh evidence after commit. List serialization retains prefetched invitation data to avoid adding a per-row query. The dialog uses the returned state immediately, disables resend while submitting, and provides clear failure and development-transport messages.

| Stored `email_status` | Meaning |
|---|---|
| `pending` | Reserved / queued / sending; no acceptance evidence yet |
| `accepted` | SMTP backend accepted the message; inbox delivery is not guaranteed |
| `failed` | Message could not be submitted; safe server logs identify the failure category |
| `local` | Captured in the automated-test memory/file mailbox; no provider submission |
| `sent` | Preserved historical backend acceptance; transport is unknown |

`state` remains independent: `existing_account`, `pending`, `expired`, or `accepted`. No historical `sent` rows were relabeled as SMTP accepted. Migration [accounts.0009](../backend/apps/accounts/migrations/0009_invitation_delivery_evidence.py) changes field choices only; PostgreSQL `sqlmigrate` confirms it emits no schema/data SQL. The migration is exercised in isolated tests and has not been applied to the existing application databases during this investigation.

## Modified implementation and tests

| Files | Purpose |
|---|---|
| [accounts/invitations.py](../backend/apps/accounts/invitations.py) | Transactional reservation, idempotent dispatch, token checks, fresh status |
| [accounts/auth.py](../backend/apps/accounts/auth.py) | Transport classification, safe failures, normalized setup URL |
| [accounts/views.py](../backend/apps/accounts/views.py), [accounts/importing.py](../backend/apps/accounts/importing.py), [academics/admission.py](../backend/apps/academics/admission.py) | Integrate reservation and post-commit sending into all account-creation paths |
| [accounts/models.py](../backend/apps/accounts/models.py), [0009 migration](../backend/apps/accounts/migrations/0009_invitation_delivery_evidence.py) | Explicit delivery evidence choices without rewriting history |
| [check_invitation_delivery.py](../backend/apps/accounts/management/commands/check_invitation_delivery.py) | Read-only, credential-free configuration/account diagnostic; never connects to SMTP |
| [InvitationReview.tsx](../frontend/src/features/resources/InvitationReview.tsx) | Immediate, truthful delivery feedback and retry behavior |
| [test_invitation_delivery.py](../backend/tests/test_invitation_delivery.py), [test_invitation_policy.py](../backend/tests/test_invitation_policy.py) | Transport, recipient/link, rollback, duplicate, password protection, expiry, resend and authorization regressions |
| [InvitationReview.test.tsx](../frontend/src/features/resources/InvitationReview.test.tsx), [workflows.test.tsx](../frontend/src/features/workflows.test.tsx) | Sending/acceptance/failure/local/legacy/expired/accepted UI states |
| [zzz-auth-policy.spec.ts](../frontend/e2e/zzz-auth-policy.spec.ts), [helpers.ts](../frontend/e2e/helpers.ts) | Browser retry/activation/reset checks and current guided admission helper |
| [playwright.config.ts](../frontend/playwright.config.ts), [e2e-server.py](../scripts/e2e-server.py) | Optional isolated test ports; preserve default ports and refuse occupied frontend ports |
| [Dashboard.tsx](../frontend/src/features/analytics/Dashboard.tsx), [architecture.test.tsx](../frontend/src/features/architecture.test.tsx) | Repair pre-existing optional-prop type errors and update a stale navigation assertion; no dashboard design change |

The handbook, API description, progress and limitations link this correction. No working SMTP credentials, `.env` values, existing account/academic records or model artifacts were changed. Test fixtures run in separate databases; no application database was reset, seeded or migrated.

## Manual verification for the reported recipient

1. Use one backend instance and one frontend instance. Stop obsolete development servers in their owning terminals. Start from a fresh PowerShell terminal at the repository root so old `DB_ENGINE`/`EMAIL_BACKEND` overrides are not inherited. Keep the existing `.env` and credentials.
2. Run the read-only diagnostic, replacing the placeholder with the recipient's email:

   ```powershell
   .\.venv\Scripts\python.exe backend/manage.py check_invitation_delivery --email '<recipient-email>'
   ```

   Expect SMTP, the intended PostgreSQL database engine, the frontend URL `http://127.0.0.1:5174`, and exactly one matching account. This command never sends email. If it reports zero, stop: the reported account was found only in preserved SQLite during this investigation. Reconcile that existing account and its related institute data into the authoritative PostgreSQL dataset through a reviewed migration; do not create a duplicate or reset either database merely to make it appear.
3. Once the intended dataset is confirmed, apply the choice-only migration through the usual deployment procedure, then start the backend and frontend using that same environment:

   ```powershell
   .\.venv\Scripts\python.exe backend/manage.py migrate accounts 0009
   .\.venv\Scripts\python.exe backend/manage.py runserver 127.0.0.1:8000
   # In a second fresh terminal at the repository root:
   npm.cmd --prefix frontend run dev -- --port 5174 --strictPort
   ```

4. Sign in as the appropriate Institute Admin, open People, find the existing Department Head, then **Actions → Invitation → Resend invitation** once. A live delivery test requires the user's confirmation before an agent performs this action. Observe **Sending**, followed by **Submitted to email provider** or **Email sending failed**. Local/legacy acceptance must not be treated as SMTP submission.
5. For SMTP acceptance, check the recipient's inbox and Spam folder. Open only the newest setup link; confirm its origin and port, choose a password, and sign in. The invitation should show **Invitation accepted**, and the link must fail if reused. A resending failure leaves the existing account intact; the prior token is invalidated and another successful resend is required.
6. For failure, inspect the safe exception-class log and the backend's actual configuration. Do not paste credentials, full message bodies or setup URLs into logs or tickets. SMTP acceptance without an inbox message requires provider-side delivery investigation; the application cannot prove delivery to Gmail's inbox.

## Verification and remaining limits

Final executed counts are maintained in [IMPLEMENTATION_PROGRESS.md](../IMPLEMENTATION_PROGRESS.md). Tests use Django memory/file email backends and mocked SMTP responses; no real delivery test was authorized or sent by this task. The user's reported successful manual Gmail delivery is separate evidence.

| Executed check | Final result |
|---|---|
| Focused PostgreSQL invitation/account/admission regression, normal password hasher | 30 passed |
| Full isolated PostgreSQL regression, fast test-only password hasher | 206 passed; zero failures/errors/skips; 156.19 seconds |
| Frontend Vitest, two workers | 66 passed; 44.99 seconds |
| Selected Chromium invitation/CSV/assessment workflows | 4 passed; 3.5 minutes |
| TypeScript and production frontend build | Passed; existing large-chunk advisory only |
| Django checks, migration drift, OpenAPI validation and invitation schema comparison | Passed |
| PostgreSQL migration SQL inspection | Choice-only migration emits no schema/data SQL |
| Git whitespace, report file links, private configured-value scan | Passed |

Evidence is saved in `backend/invitation-regression-final.log`, `backend/test-results/invitation-regression-final.xml`, `frontend/invitation-vitest.log`, `frontend/invitation-browser.log` and `backend/test-results/invitation-openapi.yaml` (ignored local verification artifacts).

The focused PostgreSQL and browser tests use the normal application password-hasher configuration. The full PostgreSQL regression uses a fresh `test_invitation_*` database and sets `PASSWORD_HASHERS` to Django's MD5 hasher only inside its test process, to avoid repeatedly computing production-strength fixture passwords. This does not change application settings or password validation. The earlier normal-hasher full run was interrupted after reaching 34% without reported failures; it is not counted as a completed pass. The completed focused run, component suite and browser runs are reported separately, not added together as unique tests.

The browser helper was updated for the existing guided student admission page; the former helper waited for a removed dialog button. Initial browser results were two passed/two failed before that test-helper repair. The initial frontend run found one outdated navigation assertion, and a later parallel run hit four five-second timeouts under machine load; the bounded two-worker rerun passed. The existing dashboard's optional color/tint/kind typing was corrected so typecheck/build could complete, without altering its rendering logic. Existing unrelated changes, including a shared component edited outside this task, were preserved.

Sending remains synchronous after commit, with no durable background queue or automatic retry daemon. Process termination or a database failure after SMTP acceptance can leave pending/uncertain evidence; a reviewed resend is the recovery path and delivery is not claimed to be exactly once across process crashes. Existing application processes were not terminated by this task. The split recipient dataset still needs reconciliation before this recipient can be verified through the intended PostgreSQL application.
