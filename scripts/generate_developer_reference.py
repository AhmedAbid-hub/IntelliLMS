"""Build developer references from Django registration without reading application rows.

Run from the repository root with the project's Python environment.
--write updates documentation; --check detects stale generated documentation.
--verify-postgres additionally checks live columns in a read-only transaction.
No migrations, data writes, email, model training or database creation occur.
"""
import argparse
import inspect
import os
from pathlib import Path
import re
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.apps import apps
from django.db import connection, transaction
from django.db.backends.utils import CursorWrapper
from django.db.migrations.recorder import MigrationRecorder
from django.urls import resolve
from rest_framework.schemas.generators import EndpointEnumerator

DOMAIN_APPS = {"accounts", "academics", "learning", "insights"}


def source_link(obj):
    """Use the implementation's file, never a guessed module-to-path conversion."""
    try:
        path = Path(inspect.getsourcefile(obj)).resolve().relative_to(ROOT)
    except (TypeError, ValueError):
        return "Django / DRF framework"
    if not path.parts or path.parts[0] != "backend":
        return "Django / DRF framework"
    return f"[{path.as_posix()}](../{path.as_posix()})"


def models():
    return sorted(
        [*apps.get_models(include_auto_created=True), MigrationRecorder.Migration],
        key=lambda model: model._meta.db_table,
    )


def model_purpose(model):
    existing = (ROOT / "docs/DATABASE_CODE_MAP.md").read_text(encoding="utf-8")
    match = re.search(
        rf"^### {re.escape(model.__name__)}\s*\n\n([^\n]+)", existing, re.M
    )
    if match:
        return match[1]
    if model._meta.auto_created:
        return f"Join table for {model._meta.auto_created._meta.label}; stores links rather than a separate workflow."
    return {
        "auth.Permission": "Django permission definition, maintained by migrations.",
        "auth.Group": "Django framework permission grouping; institute roles use Membership instead.",
        "contenttypes.ContentType": "Django application/model identity used by framework permissions and logs.",
        "admin.LogEntry": "Django admin-site action history, separate from the LMS Audit model.",
        "sessions.Session": "Server-side signed session data and expiry. Treat session keys/data as secrets.",
        "migrations.Migration": "Applied Django migration names and timestamps. Never edit to repair application data.",
    }.get(model._meta.label, model._meta.verbose_name)


def model_workflow(model):
    app = model._meta.app_label
    if model._meta.auto_created:
        return f"Follows the owning {model._meta.auto_created._meta.label} workflow and authorization."
    existing = (ROOT / "docs/DATABASE_CODE_MAP.md").read_text(encoding="utf-8")
    section = re.search(
        rf"^### {re.escape(model.__name__)}\s*\n(.*?)(?=^###? |\Z)",
        existing, re.M | re.S,
    )
    if section:
        match = re.search(r"\| API users \| (.*?) \|", section[1])
        if match:
            return match[1] + " See the linked feature and permission maps for read/write rules."
    return "Django framework operations; no ordinary LMS resource endpoint." if app not in DOMAIN_APPS else "See the feature map and service authorization before changing related records."


def dictionary():
    result = [
        "# Database dictionary",
        "",
        "Generated from the current Django model registry, including inherited fields, automatic join tables and Django framework tables. Types below use the PostgreSQL backend. No student records or credentials are included.",
        "",
        "Regenerate: `python scripts/generate_developer_reference.py --write`. Check the live target's table/column agreement with `--verify-postgres --check`; that mode uses a read-only transaction. Index names created automatically by PostgreSQL may differ; inspect them in DBeaver. No cosmetic schema changes are required.",
        "",
        "Read [relationships](DATABASE_RELATIONSHIPS.md), [feature workflows](FEATURE_WORKFLOWS.md), [role rules](ROLES_AND_PERMISSIONS.md) and the [visual explorer guide](DATABASE_EXPLORER_GUIDE.md). Public API names do not necessarily equal physical table names. The `on_delete` labels describe Django ORM deletion policies, not PostgreSQL ON DELETE clauses.",
        "",
    ]
    for model in models():
        meta = model._meta
        fields = meta.local_fields
        tenant = any(field.name == "institute" for field in fields)
        scope = (
            "Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope."
            if tenant else
            "Inherited through the owning relation; no direct institute column."
            if meta.auto_created else
            "Global identity/configuration/framework table. Access is mediated by its workflow, not a direct institute column."
        )
        sensitive = (
            "Public platform branding fields; writes restricted to Super Admin."
            if meta.label == "accounts.PlatformConfiguration" else
            "Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care."
        )
        result += [
            f"## {meta.db_table}", "",
            f"**Model:** `{meta.label}` · **Source:** {source_link(meta.auto_created or model)}", "",
            str(model_purpose(model)), "",
            f"**Workflow / roles:** {model_workflow(model)}", "",
            f"**Institute scope:** {scope}", "",
            f"**Sensitive information:** {sensitive}", "",
            "| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |",
            "|---|---|---|---|---|",
        ]
        for field in fields:
            details = []
            if field.primary_key:
                details.append("PRIMARY KEY")
            elif field.unique:
                details.append("UNIQUE")
            if field.db_index:
                details.append("indexed")
            if field.is_relation:
                related = field.remote_field.model
                details.append(f"FK → `{related._meta.db_table}.{field.target_field.column}`")
                details.append("on_delete=" + field.remote_field.on_delete.__name__)
            result.append(
                f"| `{field.column}` | `{field.name}` | `{field.db_type(connection)}` | {'yes' if field.null else 'no'} | {'; '.join(details) or '—'} |"
            )
        result += ["", "**Additional constraints and indexes:**", ""]
        constraints = [
            f"- `{constraint.name}`: `{str(constraint).replace('|', '/')}`"
            for constraint in meta.constraints
        ]
        constraints += [
            f"- Unique together: `{', '.join(group)}`." for group in meta.unique_together
        ]
        constraints += [
            f"- Index `{index.name}`: `{', '.join(index.fields)}`." for index in meta.indexes
        ]
        result += constraints or ["Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints."]
        result += [""]
    return "\n".join(result)


def er_diagram(selected):
    chosen = {model._meta.db_table: model for model in selected}
    lines = ["```mermaid", "erDiagram"]
    for table, model in chosen.items():
        lines.append(f"  {table} {{")
        for field in model._meta.local_fields:
            if field.primary_key or field.is_relation:
                field_type = re.sub(r"[^a-zA-Z0-9_]", "_", field.get_internal_type())
                lines.append(f"    {field_type} {field.column} {'PK' if field.primary_key else 'FK'}")
        lines.append("  }")
    for table, model in chosen.items():
        for field in model._meta.local_fields:
            if field.is_relation and field.remote_field.model._meta.db_table in chosen:
                parent = field.remote_field.model._meta.db_table
                parent_end = "|o" if field.null else "||"
                child_end = "o|" if field.unique else "o{"
                lines.append(f'  {parent} {parent_end}--{child_end} {table} : "{field.column}"')
    return "\n".join(lines + ["```"])


def relationships():
    all_models = models()
    groups = {
        "Complete database ER diagram": lambda m: True,
        "Accounts and institutes": lambda m: m._meta.app_label == "accounts",
        "Academic structure": lambda m: m._meta.app_label == "academics" or m.__name__ == "Institute",
        "Student admission and enrollment": lambda m: m.__name__ in {
            "User", "Institute", "Membership", "Unit", "Year", "Term", "Program", "Section",
            "AdmissionBatch", "AdmissionReceipt", "StudentPlacement", "ProgressionDecision",
            "Course", "Offering", "Enrollment",
        },
        "Teaching assignments": lambda m: m.__name__ in {
            "User", "Institute", "Membership", "TeacherAppointment", "Unit", "Offering", "Course",
        } or bool(m._meta.auto_created and m._meta.auto_created.__name__ in {"Membership", "Offering"}),
        "Attendance": lambda m: m.__name__ in {
            "User", "Institute", "Offering", "Enrollment", "Attendance", "AttendanceSession", "CorrectionRequest",
        },
        "Assignments and grading": lambda m: m.__name__ in {
            "User", "Institute", "Offering", "Assignment", "Submission", "Quiz", "Question",
            "Attempt", "ManualGrade", "CorrectionRequest", "Enrollment",
        },
    }
    result = [
        "# Database relationships", "",
        "Generated from actual foreign keys. Diagrams show PK/FK columns; the [dictionary](DATABASE_DICTIONARY.md) lists every column, type and constraint. Automatic join tables make many-to-many links explicit. Missing edges mean there is no database foreign key, even when a service uses an identifier.",
        "",
        "A Course is a subject in the catalog; an Offering is its delivery in a period/group. A User is a global login; Membership is the user's role in one institute. Unit means department outside schools. Enrollment links a learner to an offering; StudentPlacement records class/program placement history.",
        "",
        "`CorrectionRequest.target_id` and Audit.object_id are workflow identifiers, not invented foreign keys. Resolve them only through the existing scoped governance/audit code. Django deletion policies are ORM behavior; do not assume direct SQL has the same history protection.",
        "",
    ]
    for title, predicate in groups.items():
        result += [f"## {title}", "", er_diagram([m for m in all_models if predicate(m)]), ""]
    result += [
        "## Analytics and predictions data flow", "",
        "This is a computation diagram, not additional database relationships. Attendance and activity provide academic context; they are not OULAD model inputs.", "",
        "```mermaid",
        "flowchart LR",
        '  Released["Released prior Submission + Assignment records"] --> Inputs["prediction_inputs.py: chronological eligibility and percentages"]',
        '  Inputs --> Inference["ml/inference.py + preserved OULAD artifact"]',
        '  Inference --> Prediction["insights_prediction: versioned estimate"]',
        '  Offering["Scoped Offering + active Enrollment"] --> Batch["AnalysisRun + bounded AnalysisItem processing"]',
        '  Batch --> Inputs',
        '  Prediction --> Summary["reporting.py + readiness.py: active-model summary and historical records"]',
        '  Context["Attendance, Completion, Activity, grades"] --> Reports["Gradebook, progress and reports"]',
        '  Context --> Display["Separate academic context"]',
        '  Summary --> UI["Learning Insights and authorized role views"]',
        '  Reports --> UI',
        '  Display --> UI',
        "```", "",
        "Prediction target: the next **submitted assignment** scoring below 40%. It is not final course failure, dropout or attendance prediction. See [ML guide](ANALYTICS_AND_ML.md).", "",
    ]
    return "\n".join(result)


def endpoints():
    # These plain-Django/schema-excluded endpoints must also resolve. They are
    # documented below the automatically enumerated DRF table.
    for path in ("/api/v1/", "/api/v1/auth/csrf/", "/health/", "/ready/"):
        resolve(path)
    rows = []
    for path, method, callback in EndpointEnumerator().get_api_endpoints():
        cls = callback.cls
        actions = getattr(callback, "actions", {})
        action = actions.get(method.lower(), method.lower())
        handler = getattr(cls, action, cls)
        # Function-based DRF views carry the original function in their handler closure.
        for cell in getattr(handler, "__closure__", ()) or ():
            candidate = cell.cell_contents
            if inspect.isfunction(candidate) and candidate.__module__.startswith(("apps.", "config.")):
                handler = candidate
                break
        model = getattr(cls, "model", None)
        serializer = getattr(cls, "serializer_class", None)
        source = source_link(handler)
        if source == "Django / DRF framework":
            source = source_link(cls)
        # Dynamic structure classes inherit HTTP methods from the shared tenant base.
        if model and "/views/base.py" in source:
            source += " · " + source_link(cls) if source_link(cls) != "Django / DRF framework" else ""
        rows.append((path, method, f"{cls.__name__}.{action}" if actions else cls.__name__, source,
                     serializer.__name__ if serializer else "Dynamic / action contract; see feature map and OpenAPI",
                     model._meta.label if model else "Service-dependent; see feature map"))
    result = [
        "# API endpoint map", "",
        "Generated from Django/DRF registration. The method column means a route exists, **not** that every role may call it. The [feature map](BACKEND_FEATURE_MAP.md), [permission map](ROLES_AND_PERMISSIONS.md) and [OpenAPI](openapi.yaml) describe contracts and guards. Registered enrollment/submission/attempt mutations can intentionally reject direct CRUD.",
        "",
        f"{len(rows)} schema-enumerated method/path pairs, {len({row[0] for row in rows})} distinct DRF paths (including schema/docs). The four additional routes below bring the complete non-admin inventory to {len({row[0] for row in rows}) + 4} paths. HEAD/OPTIONS and format-suffix duplicates are omitted. The schema enumerator excludes the discovery root and plain Django CSRF endpoint.",
        "",
        "| Method | Path | Handler | Implementation | Serializer / validation | Primary model |",
        "|---|---|---|---|---|---|",
    ]
    result += [
        f"| {method} | `{path}` | `{handler}` | {source} | {serializer} | {model} |"
        for path, method, handler, source, serializer, model in sorted(rows)
    ]
    result += [
        "", "## Operational and framework routes", "",
        "| Method | Path | Purpose / source |", "|---|---|---|",
        "| GET | `/api/v1/` | Authenticated DRF discovery root; [urls.py](../backend/config/urls.py) |",
        "| GET | `/api/v1/auth/csrf/` | CSRF cookie bootstrap; [auth.py](../backend/apps/accounts/auth.py) |",
        "| GET | `/health/` | Liveness; [urls.py](../backend/config/urls.py) |",
        "| GET | `/ready/` | Database readiness; [health.py](../backend/config/health.py) |",
        "| GET | `/api/schema/` | Generated OpenAPI, authenticated; already counted above |",
        "| GET | `/api/docs/` | Swagger UI, authenticated; already counted above |",
        "| Framework | `/admin/` | Django admin site; framework-generated child URLs |",
        "",
    ]
    return "\n".join(result)


def verify_postgres():
    if connection.vendor != "postgresql":
        raise RuntimeError("PostgreSQL verification requires the PostgreSQL configuration; no SQLite substitution.")
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
            tables = set(connection.introspection.table_names(cursor))
            expected = {model._meta.db_table for model in models()}
            if tables != expected:
                raise RuntimeError(f"Table inventory differs: missing={sorted(expected-tables)}, extra={sorted(tables-expected)}")
            for model in models():
                actual = {column.name for column in connection.introspection.get_table_description(cursor, model._meta.db_table)}
                expected_columns = {field.column for field in model._meta.local_fields}
                if actual != expected_columns:
                    raise RuntimeError(f"Column mismatch: {model._meta.db_table}")
    print(f"PostgreSQL read-only metadata verification passed: {len(tables)} tables.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    parser.add_argument("--verify-postgres", action="store_true")
    args = parser.parse_args()
    # Generation itself must never issue SQL, including incidental schema introspection.
    with (
        patch.object(CursorWrapper, "execute", side_effect=RuntimeError("SQL forbidden while generating documentation")),
        patch.object(CursorWrapper, "executemany", side_effect=RuntimeError("SQL forbidden while generating documentation")),
    ):
        generated = {
            "DATABASE_DICTIONARY.md": dictionary(),
            "DATABASE_RELATIONSHIPS.md": relationships(),
            "API_ENDPOINT_MAP.md": endpoints(),
        }
    stale = []
    for name, content in generated.items():
        path = ROOT / "docs" / name
        content = content.rstrip() + "\n"
        if args.write:
            path.write_text(content, encoding="utf-8")
        elif not path.exists() or path.read_text(encoding="utf-8") != content:
            stale.append(name)
    if stale:
        raise SystemExit("Stale generated documentation: " + ", ".join(stale))
    print(f"Generated reference {'written' if args.write else 'verified'}: {len(generated)} files; zero generation SQL.")
    if args.verify_postgres:
        verify_postgres()


if __name__ == "__main__":
    main()
