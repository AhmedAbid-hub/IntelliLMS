# School, college and university rules

The authoritative backend configuration is [accounts/institution.py](../backend/apps/accounts/institution.py). [useInstitution](../frontend/src/lib/institution.ts) consumes the session's `academic_config`; its fallback preserves existing behavior when that response is absent. [Terminology](../frontend/src/lib/terminology.ts) controls configured labels. This refactor does not replace these with a second policy engine.

| Rule | School | College | University |
|---|---|---|---|
| Departments / Heads | Not supported | Department structure where applicable | Department structure |
| Default progression | Annual, default duration 1 | Annual, default duration 2 | Semester, default duration 8 |
| Teacher assignment | Direct school administration | Department appointment/assignment | Department appointment/assignment |
| Program terminology | Classes/grades and sections | Programs and study years | Programs, batches and semesters |
| GPA | No university GPA policy | No university GPA policy | Only when configured |
| Attendance, assessments, privacy | Same tenant/course/self protections | Same protections | Same protections |

Validation is shared through [academic serializers](../backend/apps/academics/serializers.py), [eligibility](../backend/apps/academics/eligibility.py), [admission](../backend/apps/academics/admission.py) and [progression](../backend/apps/academics/progression.py). Keep period boundaries, program/section relationships, history and audit reasons intact.

## Existing differences to understand

The current Course Offerings browser uses department-first selection for an Institute Admin when `institution.departments` is true. Its local stage buttons still say “Semester” for colleges as well as universities, and department counts/stages are derived from the currently fetched offering page. These are existing implementation limitations, not new behavior introduced by this refactor. Schools take the existing non-department path. Keep the UI unchanged here; any correction to terminology/count semantics is a separately tested functional change.

The frontend configuration's college `batches` flag is false, while parts of the academic navigation/resource policy still expose admission batches outside schools. The existing handbook records this boundary. No school/college rule has been silently broadened or narrowed to make the documentation simpler.

See [institution tests](../backend/tests/test_institution_rules.py), [browser school workflow](../frontend/e2e/architecture-school.spec.ts), [teacher appointment workflow](../frontend/e2e/appointment-dropdown.spec.ts) and the [permission map](ROLES_AND_PERMISSIONS.md).
