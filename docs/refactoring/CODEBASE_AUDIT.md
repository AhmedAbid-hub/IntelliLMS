# Codebase audit — 20 October 2026

The baseline was a clean `master` checkout with extensive existing functionality. The task is source organization and documentation, not a new architecture, UI redesign or database repair.

| Finding | Refactoring response |
|---|---|
| `main.tsx` mixed bootstrapping, providers and routing | Separate App, providers, router and resource registry |
| Thirty major resource URLs were discoverable only through a generic key | Named page entry files retain the shared engine |
| Shell mixed large navigation arrays, state, sidebar and header | Navigation, Sidebar and Header extracted; effects and session changes stay in Shell |
| ResourcePage included people menus, audit rendering, platform presentation, action UI and listing orchestration | Extract focused presentation/actions while retaining existing queries and listing behavior |
| ResourceForm mixed account/course wizards and generic form handling | Separate account/course form bodies, field/value helpers and a shared controller |
| Dashboard mixed all role-specific panels and low-level rendering | Named role bodies and focused department/learning/presentation modules |
| Student admission and placement shared one file; corrections combined dialog and queue | Shared placement fields, separate StudentPlacement and AcademicReviews implementations |
| `views.py` in each app mixed several independent feature handlers | Feature-named view packages with compatibility imports |
| Account serializers were embedded in HTTP views | Separate institute/membership serializers |
| Existing service/policy modules already had cohesive responsibilities | Preserve them; do not add wrapper folders merely to increase file count |
| Existing handbook lacked physical columns/types, complete ER views and visual exploration instructions | Generated dictionary/relationships/API map, plus beginner DBeaver guide |
| Old handbook omitted `/departments-programs` | Inventory now accounts for 25 router patterns and 53 expanded concrete page patterns |
| College offering stage labels/counts and some UI/backend batch behavior differ from intended wording | Document existing differences; do not alter functionality in a refactor |

Source inspection confirms current Head correction review uses explicit offering delegation and an independent reviewer. Earlier conversations or reports are not proof of current behavior.

The baseline browser suite selected seven dashboard/navigation workflows, all passing before edits. Full broader browser execution exposed older test assumptions and later timeouts; their fixes/reruns are recorded in [PROGRESS.md](PROGRESS.md). Do not interpret a historical test count as a fresh pass.

No database/table/model/field renaming, schema migration, role expansion, CSS redesign or model retraining is needed.
