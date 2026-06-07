-- ============================================================
-- MIGRATION 001: Link auth.users to employees + correct RLS
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ----------------------------------------------------------------
-- STEP 1: Add auth link + role column to employees
-- ----------------------------------------------------------------

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'employee'
    CHECK (role IN ('admin', 'hr', 'manager', 'employee'));

-- ----------------------------------------------------------------
-- STEP 2: Helper functions (SECURITY DEFINER = run as table owner,
--         bypasses RLS so they always work)
-- ----------------------------------------------------------------

-- Returns the current auth user's employee_id (or null)
CREATE OR REPLACE FUNCTION get_my_employee_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT employee_id FROM employees WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Returns the current auth user's role (or null)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM employees WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Called on first login: matches auth email to employees.email
-- and sets user_id. Safe: only sets if email matches and user_id is null.
CREATE OR REPLACE FUNCTION link_employee_to_auth()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  matched_employee employees%ROWTYPE;
BEGIN
  -- Find employee by email (case-insensitive)
  SELECT * INTO matched_employee
  FROM employees
  WHERE lower(email) = lower(auth.email())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('status', 'no_employee', 'message', 'No employee record found for this email');
  END IF;

  -- If already linked to a different user, reject
  IF matched_employee.user_id IS NOT NULL AND matched_employee.user_id != auth.uid() THEN
    RETURN json_build_object('status', 'already_linked', 'message', 'Employee record already linked to a different user');
  END IF;

  -- Link this auth user to the employee record
  UPDATE employees
  SET user_id = auth.uid()
  WHERE employee_id = matched_employee.employee_id;

  RETURN json_build_object(
    'status', 'ok',
    'employee_id', matched_employee.employee_id,
    'role', matched_employee.role
  );
END;
$$;

-- ----------------------------------------------------------------
-- STEP 3: Drop old (broken) RLS policies from Manus setup
-- ----------------------------------------------------------------

-- employees
DROP POLICY IF EXISTS employees_manager_select_team ON employees;
DROP POLICY IF EXISTS employees_select_own ON employees;

-- attendance
DROP POLICY IF EXISTS attendance_employee_delete_own ON attendance;
DROP POLICY IF EXISTS attendance_employee_insert_own ON attendance;
DROP POLICY IF EXISTS attendance_employee_select_own ON attendance;
DROP POLICY IF EXISTS attendance_employee_update_own ON attendance;
DROP POLICY IF EXISTS attendance_manager_delete_for_team ON attendance;
DROP POLICY IF EXISTS attendance_manager_insert_for_team ON attendance;
DROP POLICY IF EXISTS attendance_manager_select_for_team ON attendance;
DROP POLICY IF EXISTS attendance_manager_update_for_team ON attendance;

-- contracts
DROP POLICY IF EXISTS contracts_employee_select_own ON contracts;
DROP POLICY IF EXISTS contracts_manager_select_team ON contracts;

-- departments
DROP POLICY IF EXISTS departments_employee_or_manager_select ON departments;

-- leaverequests
DROP POLICY IF EXISTS leaverequests_employee_insert_own ON leaverequests;
DROP POLICY IF EXISTS leaverequests_employee_rw_own ON leaverequests;
DROP POLICY IF EXISTS leaverequests_employee_update_own ON leaverequests;
DROP POLICY IF EXISTS leaverequests_manager_select_team ON leaverequests;
DROP POLICY IF EXISTS leaverequests_manager_update_status ON leaverequests;

-- leavebalances
DROP POLICY IF EXISTS leavebalances_employee_insert_own ON leavebalances;
DROP POLICY IF EXISTS leavebalances_employee_select_own ON leavebalances;
DROP POLICY IF EXISTS leavebalances_employee_update_own ON leavebalances;
DROP POLICY IF EXISTS leavebalances_manager_select_team ON leavebalances;
DROP POLICY IF EXISTS leavebalances_manager_update_team ON leavebalances;

-- performancereviews
DROP POLICY IF EXISTS performancereviews_manager_access ON performancereviews;

-- documents
DROP POLICY IF EXISTS documents_manager_access ON documents;

-- disciplinaryrecords
DROP POLICY IF EXISTS disciplinaryrecords_manager_access ON disciplinaryrecords;

-- ----------------------------------------------------------------
-- STEP 4: Enable RLS on all tables (safe to run if already enabled)
-- ----------------------------------------------------------------

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaverequests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leavebalances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE performancereviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinaryrecords ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- STEP 5: New correct RLS policies
--
-- Role hierarchy:
--   admin/hr  → full access to everything
--   manager   → see/manage own record + direct reports
--   employee  → see own record only
-- ----------------------------------------------------------------

-- ── EMPLOYEES ──────────────────────────────────────────────────

-- Employees see only their own record
CREATE POLICY emp_select_own ON employees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Managers see their direct reports
CREATE POLICY emp_select_team ON employees
  FOR SELECT TO authenticated
  USING (manager_id = get_my_employee_id());

-- Admin/HR see everyone
CREATE POLICY emp_select_admin ON employees
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'hr'));

-- Admin/HR can insert/update/delete employees
CREATE POLICY emp_write_admin ON employees
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'hr'))
  WITH CHECK (get_my_role() IN ('admin', 'hr'));

-- Employees can update their own non-sensitive fields
-- (admin/hr use the broader write policy above)
CREATE POLICY emp_update_own ON employees
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── DEPARTMENTS ────────────────────────────────────────────────

-- Everyone can see departments (needed for dropdowns)
CREATE POLICY dept_select_all ON departments
  FOR SELECT TO authenticated
  USING (true);

-- Only admin/hr can manage departments
CREATE POLICY dept_write_admin ON departments
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'hr'))
  WITH CHECK (get_my_role() IN ('admin', 'hr'));

-- ── CONTRACTS ──────────────────────────────────────────────────

-- Employees see their own contract
CREATE POLICY contract_select_own ON contracts
  FOR SELECT TO authenticated
  USING (employee_id = get_my_employee_id());

-- Managers see their team's contracts
CREATE POLICY contract_select_team ON contracts
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM employees
      WHERE manager_id = get_my_employee_id()
    )
  );

-- Admin/HR see and manage all contracts
CREATE POLICY contract_admin ON contracts
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'hr'))
  WITH CHECK (get_my_role() IN ('admin', 'hr'));

-- ── LEAVE REQUESTS ─────────────────────────────────────────────

-- Employees see and manage their own leave
CREATE POLICY leave_select_own ON leaverequests
  FOR SELECT TO authenticated
  USING (employee_id = get_my_employee_id());

CREATE POLICY leave_insert_own ON leaverequests
  FOR INSERT TO authenticated
  WITH CHECK (employee_id = get_my_employee_id());

CREATE POLICY leave_update_own ON leaverequests
  FOR UPDATE TO authenticated
  USING (employee_id = get_my_employee_id() AND status = 'pending')
  WITH CHECK (employee_id = get_my_employee_id());

-- Managers see and can approve/reject their team's leave
CREATE POLICY leave_select_team ON leaverequests
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM employees
      WHERE manager_id = get_my_employee_id()
    )
  );

CREATE POLICY leave_update_team ON leaverequests
  FOR UPDATE TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM employees
      WHERE manager_id = get_my_employee_id()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM employees
      WHERE manager_id = get_my_employee_id()
    )
  );

-- Admin/HR full access
CREATE POLICY leave_admin ON leaverequests
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'hr'))
  WITH CHECK (get_my_role() IN ('admin', 'hr'));

-- ── LEAVE BALANCES ─────────────────────────────────────────────

CREATE POLICY balance_select_own ON leavebalances
  FOR SELECT TO authenticated
  USING (employee_id = get_my_employee_id());

CREATE POLICY balance_select_team ON leavebalances
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM employees
      WHERE manager_id = get_my_employee_id()
    )
  );

CREATE POLICY balance_admin ON leavebalances
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'hr'))
  WITH CHECK (get_my_role() IN ('admin', 'hr'));

-- ── ATTENDANCE ─────────────────────────────────────────────────

CREATE POLICY attendance_own ON attendance
  FOR SELECT TO authenticated
  USING (employee_id = get_my_employee_id());

CREATE POLICY attendance_team ON attendance
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM employees
      WHERE manager_id = get_my_employee_id()
    )
  );

CREATE POLICY attendance_admin ON attendance
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'hr'))
  WITH CHECK (get_my_role() IN ('admin', 'hr'));

-- ── PERFORMANCE REVIEWS ────────────────────────────────────────

-- Employees see reviews about themselves
CREATE POLICY perf_select_own ON performancereviews
  FOR SELECT TO authenticated
  USING (employee_id = get_my_employee_id());

-- Reviewers (managers) see reviews they wrote
CREATE POLICY perf_select_as_reviewer ON performancereviews
  FOR SELECT TO authenticated
  USING (reviewer_id = get_my_employee_id());

-- Managers can write reviews for their team
CREATE POLICY perf_write_manager ON performancereviews
  FOR ALL TO authenticated
  USING (reviewer_id = get_my_employee_id())
  WITH CHECK (reviewer_id = get_my_employee_id());

-- Admin/HR full access
CREATE POLICY perf_admin ON performancereviews
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'hr'))
  WITH CHECK (get_my_role() IN ('admin', 'hr'));

-- ── DOCUMENTS ──────────────────────────────────────────────────

-- Employees see their own documents
CREATE POLICY docs_select_own ON documents
  FOR SELECT TO authenticated
  USING (employee_id = get_my_employee_id());

-- Managers see their team's documents
CREATE POLICY docs_select_team ON documents
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM employees
      WHERE manager_id = get_my_employee_id()
    )
  );

-- Admin/HR full access
CREATE POLICY docs_admin ON documents
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'hr'))
  WITH CHECK (get_my_role() IN ('admin', 'hr'));

-- ── DISCIPLINARY RECORDS ───────────────────────────────────────

-- Employees DO NOT see their own disciplinary records (HR/manager only)
-- Managers see records for their team
CREATE POLICY disc_select_team ON disciplinaryrecords
  FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM employees
      WHERE manager_id = get_my_employee_id()
    )
  );

-- Admin/HR full access
CREATE POLICY disc_admin ON disciplinaryrecords
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'hr'))
  WITH CHECK (get_my_role() IN ('admin', 'hr'));

-- ----------------------------------------------------------------
-- STEP 6: Grant execute on helper functions to authenticated users
-- ----------------------------------------------------------------

GRANT EXECUTE ON FUNCTION get_my_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION link_employee_to_auth() TO authenticated;

-- ----------------------------------------------------------------
-- STEP 7: Set first admin
-- After running this migration, set yourself as admin:
--
--   UPDATE employees
--   SET role = 'admin'
--   WHERE email = 'your.email@example.com';
--
-- Do this BEFORE your first login so you have admin access.
-- ----------------------------------------------------------------
