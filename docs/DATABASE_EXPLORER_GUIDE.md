# Explore PostgreSQL visually with DBeaver Community

DBeaver is a separate desktop database browser. It has not been installed or configured by this refactor. Use the existing PostgreSQL server; do not create a replacement database.

## Identify the right server

The local configuration is [docker-compose.yml](../docker-compose.yml), service `db`, PostgreSQL 17. The persistent Compose volume is `database` (its Docker name has the project prefix). Inspect/start the existing service:

```powershell
docker compose -f docker-compose.yml ps -a
docker compose -f docker-compose.yml start db
.\.venv\Scripts\python.exe backend/manage.py showmigrations --plan
```

If Docker Desktop is stopped, start it first. For a new installation only, `docker compose up -d db` creates the configured service; it is unnecessary when the existing container just needs starting. Never use `down -v`, delete volumes or reset migrations for exploration.

Inspect the root `.env` locally for `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD`. Keep the password private. Do not use an old SQLite file because its row counts look similar. This checkout's verified target is `127.0.0.1:5432/intellilms_recovered_20261012`; credentials are deliberately omitted. The container's initial default database is not proof of which database Django currently selects.

## Connect

In DBeaver Community choose **New Database Connection → PostgreSQL**. Enter the host, port, database and username from the root configuration, then the password privately. Allow the PostgreSQL JDBC driver download if DBeaver requests it. Test the connection and name it clearly, for example “IntelliLMS local — explore”. These are the standard [PostgreSQL connection settings](https://dbeaver.com/docs/dbeaver/Database-driver-PostgreSQL/).

Enable **Read-only connection** in the connection's security settings before browsing. This is a useful client restriction; a database account granted only SELECT privileges is stronger protection. Creating or changing database roles is outside this refactor. See DBeaver's [connection security restrictions](https://dbeaver.com/docs/dbeaver/Managing-security-restrictions-for-database-connection/).

## Browse tables and relationships

Expand the connection, selected database, **Schemas → public → Tables**. Open a table's **Properties** to inspect columns, primary keys, foreign keys and indexes; use **Data** to inspect rows. Menu wording can vary by version. The [Connections / Database Navigator guide](https://dbeaver.com/docs/dbeaver/Database-Navigator/) explains object navigation.

Start with `accounts_institute`, `accounts_membership`, `academics_unit`, `academics_course`, `academics_offering` and `academics_enrollment`. Match their names to the [dictionary](DATABASE_DICTIONARY.md). A UUID identifies a row; a column ending `_id` usually references another table, but check the actual foreign key.

Use the data editor's filter bar for a bounded selection, such as `active = true` or an institute ID. Clear the filter to return to the normal view; avoid loading or exporting all student data. See [data filters](https://dbeaver.com/docs/dbeaver/Data-Filters/).

Use the table/schema **Diagram** view to follow foreign keys. Keep diagram edit mode disabled; diagrams are read-only by default. The repository also provides eight model/data-flow views in [DATABASE_RELATIONSHIPS.md](DATABASE_RELATIONSHIPS.md). See DBeaver's [diagram documentation](https://dbeaver.com/docs/dbeaver/ER-Diagrams/).

## Safe SQL examples

Open an SQL editor on the verified connection. Check the database first:

```sql
BEGIN TRANSACTION READ ONLY;
SELECT current_database(), current_schema();
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
SELECT id, name, kind, active
FROM accounts_institute
ORDER BY name
LIMIT 20;
ROLLBACK;
```

After verifying the institute ID locally, a parameterized query can explore its offerings:

```sql
BEGIN TRANSACTION READ ONLY;
SELECT o.id, o.title, c.code, c.name, t.name AS period
FROM academics_offering AS o
JOIN academics_course AS c ON c.id = o.course_id
JOIN academics_term AS t ON t.id = o.term_id
WHERE o.institute_id = :institute_id
ORDER BY o.title
LIMIT 50;
ROLLBACK;
```

Supply `:institute_id` through DBeaver's parameter prompt. Direct database access bypasses LMS role restrictions; use only records you are authorized to inspect. Do not change cells, press Save, run UPDATE/DELETE/DDL, import data, expose invitation/session values, or export private backups. Use the application for academic changes so validation and audit history remain intact.
