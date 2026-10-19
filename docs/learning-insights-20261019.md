# Learning Insights investigation — 19 October 2026

## Verified cause

The reported session was **Institute Admin at Northstar University**. The active backend uses PostgreSQL `intellilms_recovered_20261012`.

- Institute Admin generation is intentionally disabled. Heads in department management also have read-only oversight. Only assigned teachers, including capability-authorized Heads in **My Teaching**, may generate estimates. These rules were preserved.
- Northstar contains **16 saved predictions**, all version `demo-1ebe68e4d646`. The active trusted model is **`oulad-a90f43b47bbf0041`**. There are no saved Northstar estimates from that active model. Excluding older/different-target predictions from its counts is correct; presenting three unexplained zeros was misleading.
- Across both institutes with saved predictions, PostgreSQL has **17 prediction records** (Northstar 16; Horizon College one). The verified SQLite snapshot has the same prediction IDs. This investigation found no missing prediction records to import.
- Northstar's four offerings contain 34 active learner-course pairs: **33 meet the current assessment-input requirements**, while one has prior scores but no published, unsubmitted future assignment. These are coverage counts, not risk predictions. No estimates were generated against live learners to populate the page.
- The authenticated, read-only Admin API checks return 200: history contains all 16 older predictions; summary has zero active-model pairs and explicitly reports the 16 historical estimates. A global loss of Recent estimates was not reproduced. A selected course/period/search can legitimately have no history; the page now explains that scope. No open browser session or screenshot file was available to identify an additional browser-only failure.

The recovered Head account belongs to Northstar's separate Computer Science unit, which currently has no offerings. Its empty department scope is intentional and distinct from Institute Admin oversight. No departments, assignments, enrollments or permissions were altered to fill it. A historical school Head record remains blocked by the existing school policy; this task does not reinterpret it as a valid school role.

## Implemented corrections

| File | Change |
|---|---|
| [readiness.py](../backend/apps/insights/readiness.py) | Read-only, tenant-scoped course/enrollment/assessment coverage using database aggregates and correlated subqueries; precise generation restrictions |
| [reporting.py](../backend/apps/insights/reporting.py) | Select latest predictions **within the active model version**, before choosing each learner-course pair; preserve separate history; return readiness with summary |
| [report_contracts.py](../backend/apps/insights/report_contracts.py), [OpenAPI](openapi.yaml) | Document the new readiness fields |
| [inference.py](../backend/ml/inference.py) | Fail safely for invalid risk thresholds and missing/incompatible pipeline feature/class metadata |
| [PredictionAvailability.tsx](../frontend/src/features/analytics/PredictionAvailability.tsx) | Explain older-model history, insufficient prior assessments, missing upcoming work, no courses/enrollments, unavailable model and role restrictions; authorized Head workspace switch |
| [Predictions.tsx](../frontend/src/features/analytics/Predictions.tsx) | Hide misleading zero-risk cards when no active-model estimates exist; show coverage; align academic-period selection across class browsing, summary and history; clarify search-empty states and model API errors |
| [ClassAnalysis.tsx](../frontend/src/features/analytics/ClassAnalysis.tsx) | Gate actions on verified scoped readiness and connect the disabled explanation to the button for assistive technology |

One genuine aggregation bug was reproduced by regression: a newer historical/different-version prediction could suppress an existing active-version prediction because the previous subquery selected the newest row across all versions first. The current query selects the latest row for the active version. An unavailable model no longer mixes incompatible historical targets into risk counts; historical records remain readable.

Coverage reports whether a learner currently has inputs, not whether a stored estimate is current. Saving/releasing grades or reaching an assignment deadline can change eligibility; existing estimates retain their generation date, model version and observed inputs. Generation revalidates enrollment, assignments, capability, institute and academic period on the server.

## Role workflow

- **Institute Admin:** Learning insights → choose academic period if needed → Browse classes → review coverage and Recent estimates. Generation stays disabled with an explanation. Ask the assigned instructor to generate current estimates.
- **Department Head:** Department management provides scoped oversight. With `can_teach` authorized, use **Switch to My Teaching**, then Browse classes and select an assigned course. Capability alone does not grant a course assignment. The server rejects oversight-mode generation and rechecks revoked assignments on every batch.
- **Teacher:** Teaching insights → Browse classes → select an assigned course → Analyze class. Course workspace → AI insights remains supported. Individual learner selection and generation remain paginated/searchable. Batch results explain insufficient data instead of inventing predictions.
- **Student:** Existing own-progress/released-results and authorized notifications remain available. Raw staff prediction history, class analysis and cross-student records remain forbidden.
- **School / college / university:** Existing institution terminology and structure remain intact. Schools do not gain departments or Heads; college study-year and university semester labels use the existing configuration.

## Model evidence and boundaries

The existing model artifact and training data were preserved. Artifact checksum/schema verification succeeds. The model uses the two latest released assignment percentages with distinct past deadlines and recorded submissions, plus a published, unsubmitted future assignment as an eligibility condition. Quizzes, attendance and activity cannot substitute for these inputs. No retraining, random scores or fabricated live predictions were introduced.

The target is the next submitted assignment scoring below 40%, conditional on another submission. Experimental bands are low below 0.20, moderate from 0.20 to below 0.40, and high from 0.40. These are probability bands, not institutional pass marks. External OULAD evaluation does not validate performance on IntelliLMS students or attendance-based predictions. See [methodology](ml-methodology.md).

## Verification

Focused PostgreSQL checks passed (15 existing reporting/public-model/contract cases, then 23 readiness/inference/public-model cases; overlapping counts). Frontend: **75 tests passed**, TypeScript and production build passed. Existing large-bundle advisory remains. Django system check, migration drift and warning-free OpenAPI validation passed. Full isolated PostgreSQL: **249 passed (281.62s)** using test-process-only fast hashing. Selected Chromium: **10 passed (2.8m)**, including all five roles and three institution dashboards, Admin oversight, Head My Teaching generation, actual teacher class/individual OULAD inference, persistence and learner pagination/search. The full suite includes the focused cases; counts are not cumulative. An initial TypeScript check rejected a Playwright-only `exact` option in the new Testing Library tests; corrected test calls passed the subsequent typecheck, all 75 tests and build. No failing test remains in this change.

The new regression cases cover school/college/university generation, Admin read-only oversight, Head capability/workspace/assignment changes, student and cross-institute denial, missing/invalid/tied/unreleased assessment history, completed future work, closed periods, active-version aggregation, term filters, history pagination/search, risk thresholds and safe model errors. UI cases cover empty explanations, disabled controls, Head switching, actual course submission, errors and historical search.

All write tests use isolated PostgreSQL or guarded disposable browser databases. Browser mail uses local capture. No live recovery, database merge/reset, academic edits, model replacement, notification sending or real invitation email is part of this work. The remaining 38 reconciliation candidates and 21 conflicts remain outside scope. No database reconciliation is needed to fix the reported prediction behavior.

Local evidence is ignored under `backend/test-results/` and in `learning-insights-*.log`: live aggregate diagnostics, read-only Admin API results, test XML, generated API validation and browser output. Private backups and invitation tokens must not be committed.

## Final preservation and concurrent activity

Final model-row comparison against the approved post-recovery snapshot confirms academic records and all 17 predictions remain exact; SQLite, root `.env` and tracked model metadata are unchanged, and the active artifact checksum matches. No application data was modified by these ML tests.

The live store did change independently during the broader work: one existing user's login timestamp, two new sessions, the choice-only accounts.0009 migration, and invitation 3's issued/expiry/version/status plus one `Membership.resend_invitation` audit. The resend is recorded at 18 October 2026 16:27:08 UTC and now has `email_status=accepted`; setup is still unaccepted. This task did not perform that resend or migration and did not revert them. SMTP acceptance is not proof of inbox delivery. These observations supersede the earlier invitation milestone's pending/failed and unapplied-migration status. Evidence: `backend/test-results/learning-insights-preservation-final.json` and `concurrent-live-activity-final.json` (no tokens or credential values).
