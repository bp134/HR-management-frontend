-- ============================================================
-- MIGRATION 004: Employee archive (GDPR / legal retention)
-- Run in Azure Postgres before deploying the delete-employee API.
-- ============================================================
--
-- When an HR/admin deletes an employee from the active directory:
--   1. The employee row is copied here, with who deleted them and when.
--   2. Every related row (contracts, documents, leave, attendance,
--      reviews, disciplinary records) is copied to archived_employee_records.
--   3. References from other active employees (manager_id) and from
--      leave/review records (approved_by, reviewer_id) are snapshotted, then
--      cleared so the active rows survive without dangling references.
--   4. The active rows are deleted, which immediately revokes app access.
--
-- Azure Blob files are NOT deleted. Their paths are retained in the archived
-- JSON payload so the files can still be retrieved for legal requests.

CREATE TABLE IF NOT EXISTS archived_employees (
  archive_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  first_name character varying(100),
  last_name character varying(100),
  date_of_birth date,
  email character varying(255),
  phone character varying(50),
  address text,
  emergency_contact_name character varying(100),
  emergency_contact_phone character varying(50),
  department_id uuid,
  manager_id uuid,
  job_title character varying(100),
  employment_type employment_type,
  start_date date,
  end_date date,
  created_at timestamp without time zone,
  user_id text,
  role employee_role,
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_by text,
  archived_by_email text,
  reason text
);

CREATE INDEX IF NOT EXISTS archived_employees_employee_id_idx
  ON archived_employees (employee_id);

CREATE INDEX IF NOT EXISTS archived_employees_email_idx
  ON archived_employees (lower(email));

CREATE INDEX IF NOT EXISTS archived_employees_archived_at_idx
  ON archived_employees (archived_at DESC);

CREATE TABLE IF NOT EXISTS archived_employee_records (
  archive_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_archive_id uuid NOT NULL
    REFERENCES archived_employees (archive_id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  record_type text NOT NULL,
  record_id uuid,
  payload jsonb NOT NULL,
  archived_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS archived_employee_records_archive_id_idx
  ON archived_employee_records (employee_archive_id);

CREATE INDEX IF NOT EXISTS archived_employee_records_employee_id_idx
  ON archived_employee_records (employee_id);

CREATE INDEX IF NOT EXISTS archived_employee_records_type_idx
  ON archived_employee_records (record_type);

-- If the API connects with a dedicated database user (see 003_azure_entra.sql),
-- grant it access to the new tables. Replace hr_api_app with the actual role.
-- GRANT SELECT, INSERT, UPDATE, DELETE
--   ON archived_employees, archived_employee_records
--   TO hr_api_app;
