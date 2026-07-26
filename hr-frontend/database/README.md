# Database

SQL migrations and a **live schema reference** exported from Azure PostgreSQL.

## Migrations

| File | Purpose |
|------|---------|
| [`migrations/003_azure_entra.sql`](migrations/003_azure_entra.sql) | Post-Supabase: Entra `user_id`, disable RLS |

## Schema reference (download from live DB)

To avoid API/frontend mismatches (missing columns, wrong types, etc.), dump the current database structure:

```bash
cd hr-api
az login                    # if using DATABASE_AUTH=entra
npm run schema:dump
```

This writes:

| Output | Description |
|--------|-------------|
| [`schema/schema.md`](schema/schema.md) | Human-readable tables, columns, defaults, enums |
| [`schema/schema.json`](schema/schema.json) | Machine-readable same data |

Re-run after any database change and commit the updated files if you want the repo to stay in sync.

## Other ways to inspect schema

**Azure Portal** — PostgreSQL server → Query editor (run SQL below).

**psql** (if installed):

```bash
az login
psql "host=YOUR_SERVER.postgres.database.azure.com port=5432 dbname=Employeedb user=YOU@domain.com sslmode=require"
```

Useful SQL:

```sql
-- All tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1;

-- Columns for one table
SELECT column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leaverequests'
ORDER BY ordinal_position;

-- Enum values
SELECT t.typname, e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY 1, e.enumsortorder;
```
