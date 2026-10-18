# Testing and debugging guide

## Contents

- [Safety and prerequisites](#safety-and-prerequisites)
- [Start the existing local application](#start-the-existing-local-application)
- [First-time setup and Docker](#first-time-setup-and-docker)
- [Environment configuration](#environment-configuration)
- [Verification commands](#verification-commands)
- [Find the tests for a feature](#find-the-tests-for-a-feature)
- [Backend test directory](#backend-test-directory)
- [Browser and frontend test directory](#browser-and-frontend-test-directory)
- [Scripts and operational files](#scripts-and-operational-files)
- [Debugging symptoms](#debugging-symptoms)
- [Handbook verification](#handbook-verification)

## Safety and prerequisites

Commands below were checked against repository scripts/configuration; they are instructions for future development, **not commands all executed during this documentation task**. The existing full verification checkpoint is 189 PostgreSQL, 59 frontend and 50 Chromium passes; see [testing.md](testing.md). No tests, model training, migration application, fixture seeding or database reset was performed to write this handbook.

Use Python 3.12+ and Node 24 for the documented environment. Python dependencies are locked in [requirements.lock.txt](../backend/requirements.lock.txt); frontend dependencies in [package-lock.json](../frontend/package-lock.json). Preserve the existing private root environment file. Do not paste passwords, invitation/reset links, session cookies, database dumps or private student records into logs or documentation.

## Start the existing local application

From repository root in PowerShell:

```powershell
# Start the existing local PostgreSQL service; retain its volume.
docker compose up -d db

# Backend terminal
powershell -ExecutionPolicy Bypass -File scripts/start-backend.ps1

# Separate frontend terminal
npm.cmd --prefix frontend run dev
```

Existing startup reads the configured database; it does not seed or reset it. Check current listeners before launching duplicate servers. If the app already runs, inspect it rather than restarting it for documentation.

| Surface | Address / source |
|---|---|
| SPA and proxied API | http://127.0.0.1:5173; [Vite config](../frontend/vite.config.ts) |
| Django dev server | http://127.0.0.1:8000 |
| Liveness | http://127.0.0.1:8000/health/ |
| Database readiness | http://127.0.0.1:8000/ready/ |
| Signed-in API docs | http://127.0.0.1:5173/api/docs/ |
| Schema | /api/schema/ |
| Django admin | http://127.0.0.1:8000/admin/ |

Vite proxies `/api` and `/health`; readiness is checked directly on port 8000. Use one hostname consistently so session and CSRF cookies are on the expected origin.

## First-time setup and Docker

For an intentionally new development checkout, configure the environment template before connecting to a database:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Configure the private local values before running setup.
docker compose up -d db
powershell -ExecutionPolicy Bypass -File scripts/setup-local.ps1
```

[setup-local.ps1](../scripts/setup-local.ps1) creates a virtual environment if absent, installs locked Python packages, applies migrations and runs npm ci. Its optional `-Demo` flag explicitly seeds fictional accounts; do not add it when continuing an existing database. No demo credentials are reproduced here.

An explicitly isolated SQLite smoke setup can use `-SQLite`; that is not PostgreSQL deployment verification and must not silently replace the existing application's selected database. For Linux/macOS use a virtual environment, install the same requirements, configure the environment and run Django/Vite using the commands in [root README](../README.md).

[Local Compose](../docker-compose.yml) contains only PostgreSQL. [Production Compose](../docker-compose.production.yml) contains db, backend and web, with persistent database, private media, static and model volumes. Backend image runs Gunicorn; frontend image builds Vite and serves it via Nginx/TLS. Migrations/collectstatic/model provisioning are explicit deployment procedures, not automatic promises from container startup. Follow [deployment.md](deployment.md) and [production.env.example](../deployment/production.env.example); never use volume deletion as a troubleshooting shortcut.

## Environment configuration

| Names | Where used / purpose |
|---|---|
| DEBUG, SECRET_KEY, ALLOWED_HOSTS | [settings.py](../backend/config/settings.py); required secret, host validation and secure production behavior |
| DB_ENGINE, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT | PostgreSQL selection/connection; exact values stay private |
| SQLITE_NAME | Explicit test/development SQLite file selection only |
| CSRF_TRUSTED_ORIGINS, FRONTEND_URL | Browser-origin protection and password/invitation link destination |
| EMAIL_BACKEND, EMAIL_HOST, EMAIL_PORT, EMAIL_TIMEOUT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_USE_TLS, DEFAULT_FROM_EMAIL | Mail transport; console transport does not prove delivery to an inbox |
| VITE_API_TARGET | Vite proxy target, especially isolated browser backend |
| E2E_PYTHON, E2E_DATABASE_DIR | Playwright runner/interpreter and guarded disposable fixture directory |
| RUNTIME_ENV_FILE, HTTP_BIND, HTTPS_BIND, TLS_DIRECTORY | Production Compose environment/listeners/certificate mount |

The root environment file is loaded with python-dotenv; already-set process variables take precedence. Do not print the full environment or Compose-expanded configuration in a shared transcript: it can expose secret values. The source templates document names/defaults, not approved production credentials.

## Verification commands

Run these when an implementation change warrants them. PostgreSQL tests create their own test database through pytest-django; do not set test configuration to an application database or use `flush` to prepare it.

```powershell
# From repository root; use the existing private PostgreSQL configuration.
$env:DB_ENGINE = 'postgresql'
$env:POSTGRES_HOST = '127.0.0.1'
$env:DEBUG = 'True'
$env:PYTHONUTF8 = '1'
.\.venv\Scripts\python.exe backend/manage.py check --database default
.\.venv\Scripts\python.exe backend/manage.py makemigrations --check --dry-run

# Backend full or focused tests (backend working directory).
Push-Location backend
..\.venv\Scripts\python.exe -m pytest
# Example focused selection:
# ..\.venv\Scripts\python.exe -m pytest tests/test_governance.py tests/test_stability_authorization.py
Pop-Location

# Frontend checks, no dev server needed.
npm.cmd --prefix frontend run typecheck
npm.cmd --prefix frontend test
npm.cmd --prefix frontend run build

# Browser suite; starts its own servers and isolated fictional database.
Push-Location frontend
npx.cmd playwright install chromium
npm.cmd run test:e2e
# Example focused journey:
# npx.cmd playwright test e2e/real-data-ml.spec.ts
Pop-Location
```

OpenAPI validation, when changing an API intentionally:

```powershell
Push-Location backend
..\.venv\Scripts\python.exe manage.py spectacular --validate --fail-on-warn --file ../docs/openapi.yaml
Pop-Location
```

That command writes the schema snapshot: review its diff as part of the implementation. It was **not** run during handbook work. Migration consistency is the dry-run check above, not permission to generate/apply new migrations automatically.

Public-model tests require the existing verified OULAD files and trusted artifact. A fresh checkout needs the explicitly documented reproduction procedure in [ml-methodology.md](ml-methodology.md); do not silently substitute synthetic training or skip real-data tests. This task did not retrain or replace models.

Playwright uses ports 8001/5174, one worker, `reuseExistingServer: false`, and a freshly allocated directory under backend/test-results/e2e-runs. [e2e_database.py](../scripts/e2e_database.py) rejects paths outside that run directory. These browser tests use explicit SQLite; they do not replace PostgreSQL API/concurrency tests. The application ports 8000/5173 and existing application data are separate.

## Find the tests for a feature

1. Find the owning service in [WHERE_TO_EDIT.md](WHERE_TO_EDIT.md).
2. Search existing backend tests for the exact endpoint/action/model or permission helper; read the neighboring negative cases.
3. Find its component tests under src and the relevant e2e spec below.
4. Exercise both allowed and denied role/tenant paths; inspect saved history and released-only visibility where relevant.
5. After behavior changes, run focused checks first, then required regression checks. Never claim checks not executed.

```powershell
rg -n 'bulk-enrollment|validate_enrollment' backend/tests frontend/e2e
rg -n 'head_correction_review|reviewer' backend/tests
rg --files frontend/src -g '*.test.ts' -g '*.test.tsx'
```

[conftest.py](../backend/tests/conftest.py) supplies isolated test-world/client fixtures. [pytest.ini](../backend/pytest.ini) sets Django settings/discovery. PostgreSQL concurrency tests intentionally need PostgreSQL; SQLite passes/skips cannot establish locking correctness.

## Backend test directory

All **50** test modules are listed. Example test names are navigation anchors, not an exhaustive test list; parametrization expands executed case counts.

| File | Example assertions to start reading |
|---|---|
| [test_academic_continuation.py](../backend/tests/test_academic_continuation.py) | `test_program_sections_and_term_aware_scheduling`<br>`test_platform_institute_details_and_due_date_filters` |
| [test_academic_policies.py](../backend/tests/test_academic_policies.py) | `test_policy_changes_validate_permissions_reason_and_preserve_audited_values`<br>`test_released_marks_and_quiz_results_require_independent_corrections_when_protected` |
| [test_academic_results.py](../backend/tests/test_academic_results.py) | `test_configured_gpa_keeps_programs_separate_and_applies_explicit_repeat_rules`<br>`test_gpa_policy_is_opt_in_validated_and_reasoned` |
| [test_account_contracts.py](../backend/tests/test_account_contracts.py) | `test_malformed_auth_payloads_are_validation_errors`<br>`test_invitation_payloads_are_atomic_and_not_silently_truncated` |
| [test_action_contracts.py](../backend/tests/test_action_contracts.py) | `test_grade_payload_rejects_coercion_truncation_and_nonfinite_marks`<br>`test_answer_contract_preserves_text_and_rejects_nontext` |
| [test_administration.py](../backend/tests/test_administration.py) | `test_csv_is_atomic_and_role_limited`<br>`test_deadline_reminders_are_idempotent` |
| [test_admission.py](../backend/tests/test_admission.py) | `test_admission_preview_atomic_creation_retry_and_scope`<br>`test_transfer_preserves_placement_and_enrollment_history` |
| [test_assessment_extras.py](../backend/tests/test_assessment_extras.py) | `test_assignment_resource_remains_private`<br>`test_quiz_release_notifications_and_history_permissions` |
| [test_attendance_roster.py](../backend/tests/test_attendance_roster.py) | `test_roster_pages_searches_and_preserves_recorded_status`<br>`test_page_marking_changes_only_requested_active_students_atomically` |
| [test_auth_and_inference.py](../backend/tests/test_auth_and_inference.py) | `test_password_reset_change_and_session`<br>`test_real_trusted_inference_persists_metadata` |
| [test_browser_database_guard.py](../backend/tests/test_browser_database_guard.py) | `test_browser_launcher_requires_explicit_run_directory`<br>`test_browser_launcher_rejects_application_directory` |
| [test_bulk_enrollment.py](../backend/tests/test_bulk_enrollment.py) | `test_bulk_enrollment_is_idempotent_scoped_and_preserves_withdrawals`<br>`test_historical_course_and_enrollment_cannot_be_deleted` |
| [test_class_analysis.py](../backend/tests/test_class_analysis.py) | `test_analysis_resume_dedup_and_partial_failures`<br>`test_analysis_role_tenant_revocation_and_archive` |
| [test_continuation_regressions.py](../backend/tests/test_continuation_regressions.py) | `test_invitation_acceptance_password_replay_and_disabled_account`<br>`test_mail_failure_preserves_committed_invites_and_continues_csv` |
| [test_course_comparisons.py](../backend/tests/test_course_comparisons.py) | `test_academic_report_filters_apply_to_every_report_and_never_expand_scope`<br>`test_comparison_facts_exclude_unreleased_excused_and_withdrawn_records` |
| [test_curriculum_setup.py](../backend/tests/test_curriculum_setup.py) | `test_curriculum_batches_validation_and_history`<br>`test_curriculum_roles_and_department_scope` |
| [test_governance.py](../backend/tests/test_governance.py) | `test_finalized_grade_correction_review_permissions_and_override`<br>`test_attendance_finalization_delegation_rejection_and_stale_proposals` |
| [test_institute_configuration.py](../backend/tests/test_institute_configuration.py) | `test_reject_invalid_grade_schemes`<br>`test_terminology_validation` |
| [test_institution_rules.py](../backend/tests/test_institution_rules.py) | `test_school_direct_assignments_and_forbidden_department_workflows`<br>`test_program_defaults_are_type_specific_and_existing_history_is_preserved` |
| [test_invitation_policy.py](../backend/tests/test_invitation_policy.py) | `test_invitation_resend_invalidates_previous_and_accepts_once`<br>`test_invitation_48h_expiry_and_revoked_membership` |
| [test_learner_progress.py](../backend/tests/test_learner_progress.py) | `test_learner_drilldown_is_scoped_released_only_and_missing_work_is_paginated`<br>`test_enrollment_selector_can_find_learners_beyond_first_page_without_scope_leaks` |
| [test_ml.py](../backend/tests/test_ml.py) | `test_dataset_validation`<br>`test_reproducible_model_pipeline` |
| [test_mutation_consistency.py](../backend/tests/test_mutation_consistency.py) | `test_calendar_edit_revalidates_existing_meetings`<br>`test_attempt_started_after_validation_still_prevents_content_change` |
| [test_notifications.py](../backend/tests/test_notifications.py) | `test_event_notifications_respect_tenant_activity_preferences_and_dedup`<br>`test_enrollment_notifications_only_on_changes_and_private_destination` |
| [test_period_integrity.py](../backend/tests/test_period_integrity.py) | `test_new_offering_requires_compatible_explicit_period_but_legacy_is_maintainable`<br>`test_attendance_calendar_boundaries_and_legacy_maintenance` |
| [test_platform_accounts.py](../backend/tests/test_platform_accounts.py) | `test_platform_directory_status_and_account_linking`<br>`test_platform_invitation_validates_explicit_target_without_selected_institute` |
| [test_platform_audit.py](../backend/tests/test_platform_audit.py) | `test_global_audit_permissions_pagination_and_filtering` |
| [test_platform_configuration.py](../backend/tests/test_platform_configuration.py) | `test_public_configuration_superadmin_write_validation_and_audit` |
| [test_platform_separation.py](../backend/tests/test_platform_separation.py) | `test_platform_role_cannot_use_academic_apis_even_with_selected_tenant` |
| [test_postgres_concurrency.py](../backend/tests/test_postgres_concurrency.py) | `test_concurrent_question_edit_and_start`<br>`test_concurrent_first_submission_and_grading_resubmission` |
| [test_profile_images.py](../backend/tests/test_profile_images.py) | `test_private_profile_upload_replace_remove_and_scope`<br>`test_avatar_rejects_disguised_oversized_and_role_changes` |
| [test_progression.py](../backend/tests/test_progression.py) | `test_progression_preserves_history_and_student_released_results`<br>`test_policy_unreleased_results_stale_evidence_and_repeat` |
| [test_public_model.py](../backend/tests/test_public_model.py) | `test_public_artifact_contract_and_missing_values`<br>`test_public_data_cutoffs_and_group_manifest` |
| [test_quiz_authoring.py](../backend/tests/test_quiz_authoring.py) | `test_bulk_questions_atomic_preview_scope_and_attempt_lock`<br>`test_question_csv_bank_order_and_safe_duplicate` |
| [test_readiness.py](../backend/tests/test_readiness.py) | `test_readiness_checks_database_and_hides_errors` |
| [test_report_pagination.py](../backend/tests/test_report_pagination.py) | `test_grade_pages_filters_stream_and_tenant_scope`<br>`test_prediction_history_pagination_and_authorization` |
| [test_reporting.py](../backend/tests/test_reporting.py) | `test_gradebook_batched_queries_and_released_scores`<br>`test_trends_exclude_other_students_departments_and_tenants` |
| [test_response_contracts.py](../backend/tests/test_response_contracts.py) | `test_report_responses_match_contracts_for_every_tenant_role`<br>`test_model_status_contract_includes_unavailable_state` |
| [test_security.py](../backend/tests/test_security.py) | `test_login_and_scope`<br>`test_tenant_isolation` |
| [test_security_audit.py](../backend/tests/test_security_audit.py) | `test_drafts_and_course_notification_audience`<br>`test_archived_questions_and_attempts_are_read_only` |
| [test_stability_authorization.py](../backend/tests/test_stability_authorization.py) | `test_finalization_cannot_be_set_through_ordinary_create_or_update`<br>`test_oversight_roles_cannot_create_or_change_manual_marks` |
| [test_stability_grading.py](../backend/tests/test_stability_grading.py) | `test_released_categories_weights_bands_and_activity_are_independent` |
| [test_staff_lifecycle.py](../backend/tests/test_staff_lifecycle.py) | `test_removal_requires_reassignment_and_preserves_history`<br>`test_replace_head_is_scoped_atomic_and_old_access_changes` |
| [test_student_agenda.py](../backend/tests/test_student_agenda.py) | `test_student_agenda_only_own_unfinished_published_work`<br>`test_agenda_bounded_and_staff_denied` |
| [test_student_import.py](../backend/tests/test_student_import.py) | `test_student_import_preview_metadata_duplicates_and_scope` |
| [test_teacher_appointments.py](../backend/tests/test_teacher_appointments.py) | `test_provision_appoint_assign_withdraw_preserves_identity`<br>`test_appointment_department_tenant_and_role_boundaries` |
| [test_teaching_assignments.py](../backend/tests/test_teaching_assignments.py) | `test_heads_assign_and_admin_override_requires_reason` |
| [test_teaching_workspace.py](../backend/tests/test_teaching_workspace.py) | `test_head_workspace_requires_capability_and_filters_personal_assignments`<br>`test_head_teaches_across_departments_without_gaining_review_or_other_class_access` |
| [test_workflows.py](../backend/tests/test_workflows.py) | `test_attendance_transaction_and_percentage`<br>`test_private_file_and_future_lesson` |
| [test_workload.py](../backend/tests/test_workload.py) | `test_workload_pagination_scope_counts_and_filters` |

## Browser and frontend test directory

All **22** browser spec files are listed. Some loop over roles/types/viewports, so file counts differ from executed journey counts.

| Browser spec | Coverage entry point |
|---|---|
| [appointment-dropdown.spec.ts](../frontend/e2e/appointment-dropdown.spec.ts) | Head can open an unclipped eligible-teacher dropdown and appoint an authorized teacher |
| [architecture-role-acceptance.spec.ts](../frontend/e2e/architecture-role-acceptance.spec.ts) | Parameterized five-role/institute-type desktop and mobile acceptance/screenshots. |
| [architecture-school.spec.ts](../frontend/e2e/architecture-school.spec.ts) | school class, direct teaching, results and reviewed promotion preserve learner history |
| [assessment-invitations.spec.ts](../frontend/e2e/assessment-invitations.spec.ts) | admin invitation → emailed password setup → student login → replay rejected |
| [attendance.spec.ts](../frontend/e2e/attendance.spec.ts) | teacher searches and saves attendance; student sees course and meeting context |
| [audit-access-workload.spec.ts](../frontend/e2e/audit-access-workload.spec.ts) | student direct navigation denies restricted pages before their API loads |
| [completion-fresh-institute.spec.ts](../frontend/e2e/completion-fresh-institute.spec.ts) | Parameterized fresh college/university setup, invitation, teaching, progression and retained results. |
| [completion-head.spec.ts](../frontend/e2e/completion-head.spec.ts) | Head switches between department oversight and assigned teaching; revocation removes teaching access |
| [completion-policy-report.spec.ts](../frontend/e2e/completion-policy-report.spec.ts) | academic protection policy saves with a reason and requires an independent correction |
| [continuation.spec.ts](../frontend/e2e/continuation.spec.ts) | people filters combine role, status and academic unit |
| [learning.spec.ts](../frontend/e2e/learning.spec.ts) | admin structure → instructor lesson and assignment → student work → released feedback |
| [platform-settings.spec.ts](../frontend/e2e/platform-settings.spec.ts) | platform configuration saves and renders on public login |
| [predictions.spec.ts](../frontend/e2e/predictions.spec.ts) | teacher can page and search the class learning insight learner selector |
| [real-data-ml.spec.ts](../frontend/e2e/real-data-ml.spec.ts) | OULAD model works through teacher Analyze Class and individual history using recorded marks |
| [reporting.spec.ts](../frontend/e2e/reporting.spec.ts) | academic progress displays authorized charts and accessible data |
| [selectors.spec.ts](../frontend/e2e/selectors.spec.ts) | course choice search and pagination reach records beyond the first fifty |
| [stability-selectors.spec.ts](../frontend/e2e/stability-selectors.spec.ts) | Dialog dropdown interaction and viewport/focus regressions. |
| [z-upgrade.spec.ts](../frontend/e2e/z-upgrade.spec.ts) | admin reviews staff departure, reassigns courses, replaces a head and bulk enrolls students |
| [zz-academic-setup.spec.ts](../frontend/e2e/zz-academic-setup.spec.ts) | admin configures curriculum, batch and section and resumes saved institute setup |
| [zzz-admission.spec.ts](../frontend/e2e/zzz-admission.spec.ts) | guided student admission reviews enrollments, activates the account and retains transfer history |
| [zzz-auth-policy.spec.ts](../frontend/e2e/zzz-auth-policy.spec.ts) | invitation failure, retry, expiry, replacement, activation and reset security work in the browser |
| [zzz-governance.spec.ts](../frontend/e2e/zzz-governance.spec.ts) | admin finalizes a grade, teacher requests a correction and independent approval preserves its audit |

Component/unit tests: [api.test.ts](../frontend/src/lib/api.test.ts), [useUrlFilters.test.tsx](../frontend/src/lib/useUrlFilters.test.tsx), [terminology.test.ts](../frontend/src/lib/terminology.test.ts), [workflows.test.tsx](../frontend/src/features/workflows.test.tsx), [completion.test.tsx](../frontend/src/features/completion.test.tsx), [architecture.test.tsx](../frontend/src/features/architecture.test.tsx), [LinkAccount.test.tsx](../frontend/src/features/resources/LinkAccount.test.tsx), [QuizAttempt.test.tsx](../frontend/src/features/quizzes/QuizAttempt.test.tsx), [PredictionContext.test.tsx](../frontend/src/features/analytics/PredictionContext.test.tsx). The latest executed checkpoint has nine files/59 cases.

Browser helpers: [helpers.ts](../frontend/e2e/helpers.ts), [lifecycle-helpers.ts](../frontend/e2e/lifecycle-helpers.ts). Traces are retained on failure under frontend/test-results; some acceptance specs save screenshots under backend/test-results. These are local generated evidence, not source. Do not publish traces containing account/session information.

## Scripts and operational files

| File | Purpose / side effects when intentionally invoked |
|---|---|
| [setup-local.ps1](../scripts/setup-local.ps1) | Install/migrate new development setup; optional explicit demo seed |
| [start-backend.ps1](../scripts/start-backend.ps1) | Start local Django using selected database |
| [e2e-server.py](../scripts/e2e-server.py), [e2e-server.ps1](../scripts/e2e-server.ps1), [e2e_database.py](../scripts/e2e_database.py) | Isolated fixture/server launch and path guard |
| [e2e-auth-control.py](../scripts/e2e-auth-control.py) | Controlled invitation/auth test scenarios within guarded browser fixture |
| [e2e-public-model-fixture.py](../scripts/e2e-public-model-fixture.py) | Compatible dates for fictional public-model browser demonstration |
| [verify-postgres.py](../scripts/verify-postgres.py) | Explicit isolated PostgreSQL verification helper; inspect target configuration first |
| [verify-containers.py](../scripts/verify-containers.py) | Disposable production-image/TLS/readiness/access/rate-limit smoke and cleanup |
| [benchmark-reporting.py](../scripts/benchmark-reporting.py) | Explicit reporting benchmark fixture/run; not a routine live command |
| [preview-attendance.mjs](../frontend/scripts/preview-attendance.mjs), [preview-check.mjs](../frontend/scripts/preview-check.mjs) | Local UI preview helpers; inspect their configured context before use |
| [e2e_settings.py](../backend/config/e2e_settings.py), [e2e_mail.py](../backend/config/e2e_mail.py) | Isolated test settings and controlled mail transport |
| [tests.yml](../.github/workflows/tests.yml) | CI jobs; public artifact preparation before backend/browser checks; hosted execution remains a separate verification boundary |

## Debugging symptoms

| Symptom | First investigation | Preserve |
|---|---|---|
| Cannot connect / readiness 503 | Existing db container state and selected host/database, then config/health.py; inspect sanitized errors | Existing volume/data; do not recreate DB as first response |
| CSRF/login 403 | Cookie hostname, CSRF bootstrap, same-origin proxy, trusted origins, auth.login_view | Session-only auth and explicit login CSRF |
| Wrong institute after switch | AuthProvider.switchContext and Scope; check selected session institute and active membership | Cache cancellation/removal; no client tenant override |
| Empty teacher appointment selector | Candidate eligibility/unit/can_teach, withdrawn appointment, Head workspace; then RelationSelect filtering | Server-side eligibility/tenant checks |
| Hidden/unclickable dropdown in dialog | RelationSelect owning-dialog portal, shared Dialog focus/pointer behavior | Accessible keyboard/focus behavior |
| Correct role but denied teaching | Effective workspace, assigned offering, active appointment/capability, closed/archived period | Do not broaden all Admin/Head permissions |
| Enrollment POST rejected | Direct CRUD is disabled; use offering bulk-enrollment with reason and compatible placement | Retained history and idempotent updates |
| Missing grade or GPA | Released state, grade weights/bands, positive credits, configured university policy, program ambiguity | No invented zero marks or unofficial transcript claim |
| Correction rejected | Original snapshot changed, missing course delegation, same requester/reviewer, invalid proposal | Independent review/audit |
| ML unavailable / insufficient data | Artifact/schema/hash, two released past assignments, distinct deadlines, upcoming unsubmitted work | No fabricated inputs, no arbitrary pickle upload |
| Report totals differ | Filter scope/placement stage, actual assignment mean versus weighted grade, active versus historical enrollments | Do not compare different metrics as if equivalent |
| Invitation reports sent but no inbox | Run `python backend/manage.py check_invitation_delivery --email '<recipient-email>'`; compare the intended database and actual server environment. [Delivery evidence and manual steps](invitation-delivery-20261018.md) distinguish SMTP, local capture and legacy unknown transport. | No secret/token logging or unreviewed account recreation; this diagnostic never sends email |
| Test setup port conflict | Default E2E ports are 8001/5174; set `E2E_BACKEND_PORT` / `E2E_FRONTEND_PORT` for isolated alternative ports. Playwright refuses reuse and Vite uses strict port binding. | Preserve live application processes and the guarded, new run-specific test database |
| Large bundle advisory | Build log, route chunks and dependency imports | Existing advisory is not build failure or evidence of load capacity |

## Handbook verification

Verification is documentation-only: file/link checks, route/resource extraction, registered URL/method inspection, model metadata inspection and source-integrity hashes. Django was initialized for registry inspection without executing ORM queries or migration commands. No browser suite or fixture reset was launched. No live database mutation command or API mutation was issued.

Executed handbook checks (16 October): all 148 URL paths and their documented methods matched the registered resolver with zero missing/extra paths; concrete UUID substitution resolved every parameterized endpoint. SQL was explicitly prohibited during that resolver verification and zero SQL calls occurred. All 22 dedicated page patterns plus the generic resource/fallback patterns matched main.tsx; all 30 configured resource pages were present. All 41 concrete models were present. Every local handbook link/anchor resolved, and every frontend source file was linked. All 315 tracked/non-ignored non-Markdown files retained their starting SHA256 hashes. The private-configuration value scan found no matches in the new guides. Git diff whitespace checks passed. These checks establish documentation/source consistency, not new runtime regression or deployment acceptance.

Final counts and validation outcomes are recorded in [implementation progress](../IMPLEMENTATION_PROGRESS.md). The inventory covers 24 React patterns / 30 configured resource pages / 52 expanded concrete page patterns, 148 backend paths (144 versioned, including discovery root), 41 concrete project models, 28 domain migration files, 50 backend test modules and 22 browser spec files. Static implementation discrepancies remain explicitly noted in [the roles map](ROLES_AND_PERMISSIONS_MAP.md#discrepancies-and-boundaries).
