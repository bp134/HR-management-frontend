-- ============================================================
-- MIGRATION 002: Convert role and employment_type to enums
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ----------------------------------------------------------------
-- STEP 1: Create the enum types
-- ----------------------------------------------------------------

CREATE TYPE employee_role AS ENUM ('admin', 'hr', 'manager', 'employee');
CREATE TYPE employment_type AS ENUM ('permanent', 'fixed_term', 'temporary', 'contractor');

-- ----------------------------------------------------------------
-- STEP 2: Convert the columns
-- We cast via text so existing valid values carry over cleanly.
-- If any row has an invalid value the cast will fail and tell you
-- which row to fix before re-running.
-- ----------------------------------------------------------------

ALTER TABLE employees
  ALTER COLUMN role
    TYPE employee_role
    USING role::employee_role;

ALTER TABLE employees
  ALTER COLUMN employment_type
    TYPE employment_type
    USING employment_type::text::employment_type;

-- ----------------------------------------------------------------
-- STEP 3: Re-apply the default now that the column type has changed
-- ----------------------------------------------------------------

ALTER TABLE employees
  ALTER COLUMN role SET DEFAULT 'employee'::employee_role;

-- ----------------------------------------------------------------
-- STEP 4: Drop the old text check constraints (now redundant —
-- the enum type enforces valid values at the database level)
-- ----------------------------------------------------------------

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_role_check;

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_employment_type_check;

-- ----------------------------------------------------------------
-- Verify: run this after to confirm both columns show as enum types
-- ----------------------------------------------------------------
-- SELECT column_name, udt_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND table_name = 'employees'
-- AND column_name IN ('role', 'employment_type');
--
-- You should see:
--   role             | employee_role
--   employment_type  | employment_type
-- ----------------------------------------------------------------
