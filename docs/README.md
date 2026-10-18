# IntelliLMS developer handbook

Source-inspected on 16 October 2026. Start here when changing a feature or preparing to explain the project. This handbook maps the current working tree, including existing uncommitted work; it is not a statement that every possible production scenario has been tested.

## Contents

- [Choose a guide](#choose-a-guide)
- [Existing project documentation](#existing-project-documentation)
- [Verification and boundaries](#verification-and-boundaries)

## Choose a guide

| Need | Guide |
|---|---|
| Understand the system and repository | [PROJECT_CODEBASE_MAP.md](PROJECT_CODEBASE_MAP.md) |
| Find a screen, route, dashboard, modal or component | [FRONTEND_PAGE_MAP.md](FRONTEND_PAGE_MAP.md) |
| Find an API, view, serializer or service | [BACKEND_CODE_MAP.md](BACKEND_CODE_MAP.md) |
| Understand models, relationships and migrations | [DATABASE_CODE_MAP.md](DATABASE_CODE_MAP.md) |
| Check role, tenant and institution rules | [ROLES_AND_PERMISSIONS_MAP.md](ROLES_AND_PERMISSIONS_MAP.md) |
| Trace public-data ML training and predictions | [AI_ML_CODE_MAP.md](AI_ML_CODE_MAP.md) |
| Find the first file to edit for a specific change | [WHERE_TO_EDIT.md](WHERE_TO_EDIT.md) |
| Follow an interaction from screen to database and back | [FEATURE_WORKFLOWS.md](FEATURE_WORKFLOWS.md) |
| Start the app, locate tests and diagnose failures | [TESTING_AND_DEBUGGING_GUIDE.md](TESTING_AND_DEBUGGING_GUIDE.md) |

## Existing project documentation

This handbook complements, rather than replaces, [the existing documentation index](index.md), [root setup instructions](../README.md), [implementation progress](../IMPLEMENTATION_PROGRESS.md), [acceptance matrix](completion-acceptance.md), [limitations](limitations.md), [API reference](api.md), [OpenAPI snapshot](openapi.yaml), [deployment guide](deployment.md), [security guide](security.md), [test evidence](testing.md), [functional requirements](functional-requirements.md), [ML methodology](ml-methodology.md) and [measured evaluation](model-evaluation.md).

## Verification and boundaries

Later targeted changes: [invitation delivery investigation and fixes, 18 October](invitation-delivery-20261018.md), including transport evidence, transaction handling, a read-only diagnostic and updated tests. The inventory counts below describe the original 16 October handbook snapshot.

The navigation inventory covers **24 React router patterns**, including the generic resource and not-found patterns; expanding the generic resource into its **30 configured resource pages** gives **52 concrete page patterns**, excluding those two generic fallbacks. The five dashboards are role variants, not five separate URLs. The backend catalog covers **148 distinct URL patterns** outside the Django admin site, including **144 under `/api/v1/`** (one is the API discovery root), plus health/readiness/schema/docs. It maps **41 concrete project Django models**; abstract bases, auto-created many-to-many tables and Django framework models are identified separately.

The final verification note in the [testing guide](TESTING_AND_DEBUGGING_GUIDE.md#handbook-verification) records link, route, endpoint and source-integrity checks. No application logic, database records, migrations, artifacts or UI components were changed for this handbook. Earlier test pass counts are historical executed evidence, not tests rerun during this documentation-only task. Static review findings are listed in the [permission map](ROLES_AND_PERMISSIONS_MAP.md#discrepancies-and-boundaries).
