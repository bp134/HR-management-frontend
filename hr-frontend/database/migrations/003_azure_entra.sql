-- ============================================================
-- MIGRATION 003: Azure PostgreSQL + Entra ID (post-Supabase)
-- Run in Azure Postgres after data migration.
-- ============================================================

-- 1. Drop Supabase auth foreign key if present
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey;

-- 2. user_id stores Entra object ID (oid) — text is fine; uuid also works
ALTER TABLE employees
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- 3. Drop Supabase-specific helper functions
DROP FUNCTION IF EXISTS link_employee_to_auth();
DROP FUNCTION IF EXISTS get_my_employee_id();
DROP FUNCTION IF EXISTS get_my_role();

-- 4. Disable RLS — authorization is enforced in the HR API
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaverequests DISABLE ROW LEVEL SECURITY;
ALTER TABLE leavebalances DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE performancereviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinaryrecords DISABLE ROW LEVEL SECURITY;

-- Optional: drop old policies (cleanup)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 5. API database user (run as admin; set password separately)
-- CREATE USER hr_api_app WITH PASSWORD '...';
-- GRANT CONNECT ON DATABASE hr TO hr_api_app;
-- GRANT USAGE ON SCHEMA public TO hr_api_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hr_api_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hr_api_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hr_api_app;

-- 6. Set first admin before Entra login
-- UPDATE employees SET role = 'admin' WHERE email = 'info@belfieldpharmacy.co.uk';
