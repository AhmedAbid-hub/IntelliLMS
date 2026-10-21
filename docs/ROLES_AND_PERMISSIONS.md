# Roles and permissions

The detailed endpoint/workspace matrix remains in [ROLES_AND_PERMISSIONS_MAP.md](ROLES_AND_PERMISSIONS_MAP.md). This is the entry guide to the enforcement locations after reorganization.

| Boundary | Source | Meaning |
|---|---|---|
| Session, institute and effective workspace | [accounts/scope.py](../backend/apps/accounts/scope.py) | Resolve active membership first; scope offerings before lookup |
| Platform versus institute management | [platform.py](../backend/apps/accounts/platform.py), [institutes.py](../backend/apps/accounts/views/institutes.py) | Super Admin does not become a routine teacher/student manager |
| Membership validation and lifecycle | [membership serializer](../backend/apps/accounts/serializers/memberships.py), [lifecycle.py](../backend/apps/accounts/lifecycle.py) | Explicit operations for role changes, revocation, replacement and reassignment |
| Tenant CRUD and related-object checks | [academic base view](../backend/apps/academics/views/base.py), [academic serializers](../backend/apps/academics/serializers.py) | Related records must belong to the same permitted institute/course |
| Teaching writes | [learning base view](../backend/apps/learning/views/base.py), [governance.py](../backend/apps/learning/governance.py) | Assigned instructors manage assessments; management visibility is not teaching authority |
| Correction review | [reviewer / can_review_request](../backend/apps/learning/governance.py) | Admin or explicitly delegated Head of the offering's own department; independent reviewer restrictions remain |
| Predictions | [prediction views](../backend/apps/insights/views/predictions.py), [batch.py](../backend/apps/insights/batch.py) | Admin oversight stays read-only; authorized assigned instructors generate |
| Frontend navigation | [access.ts](../frontend/src/lib/access.ts), [navigation.tsx](../frontend/src/components/layouts/navigation.tsx), [WorkspaceRoute.tsx](../frontend/src/components/layouts/WorkspaceRoute.tsx) | Navigation is a usability guard, never a substitute for backend authorization |

Students see enrolled offerings and their own released assessment information. Files stay private and downloads are scoped. Department Heads remain department-scoped in management and use My Teaching only with capability and a valid assignment. School Head/departments are prohibited by the existing policy.

Current inspection confirms that `reviewer()` checks `offering.head_correction_review`, membership department, offering department and visible offering scope. The refactor does not implement an older conversation preference for blanket department review; it preserves the repository's current explicit-delegation behavior and the latest request.

Negative regressions live in [backend tests](../backend/tests), including `test_security.py`, governance, teaching-workspace, institution-rule and prediction tests. Exact executed results are in [the checkpoint](refactoring/PROGRESS.md).
