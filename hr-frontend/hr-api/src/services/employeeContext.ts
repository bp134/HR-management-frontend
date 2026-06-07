import { query } from '../db.js'
import type { AuthUser, EmployeeRow, RequestContext } from '../types.js'

export type AccessStatus = 'ok' | 'no_employee' | 'already_linked'

export interface MeResponse {
  accessStatus: AccessStatus
  employee: EmployeeRow | null
  flags: {
    isAdmin: boolean
    isHR: boolean
    isManager: boolean
  } | null
  message?: string
}

export async function linkAndLoadEmployee(auth: AuthUser): Promise<MeResponse> {
  const byOid = await query<EmployeeRow>(
    'SELECT * FROM employees WHERE user_id = $1 LIMIT 1',
    [auth.oid]
  )
  if (byOid.rows[0]) {
    return buildOk(byOid.rows[0])
  }

  if (!auth.email) {
    return {
      accessStatus: 'no_employee',
      employee: null,
      flags: null,
      message:
        'No employee linked to this account yet. Ask your admin to add optional email claims on the API app in Entra, or pre-link your user_id in the database.',
    }
  }

  const byEmail = await query<EmployeeRow>(
    'SELECT * FROM employees WHERE lower(email) = lower($1) LIMIT 1',
    [auth.email]
  )
  const employee = byEmail.rows[0]

  if (!employee) {
    return {
      accessStatus: 'no_employee',
      employee: null,
      flags: null,
      message: 'No employee record found for this email',
    }
  }

  if (employee.user_id && employee.user_id !== auth.oid) {
    return {
      accessStatus: 'already_linked',
      employee: null,
      flags: null,
      message: 'Employee record already linked to a different account',
    }
  }

  if (!employee.user_id) {
    await query(
      'UPDATE employees SET user_id = $1 WHERE employee_id = $2 AND (user_id IS NULL OR user_id = $1)',
      [auth.oid, employee.employee_id]
    )
    employee.user_id = auth.oid
  }

  return buildOk(employee)
}

function buildOk(employee: EmployeeRow): MeResponse {
  const role = employee.role
  return {
    accessStatus: 'ok',
    employee,
    flags: {
      isAdmin: role === 'admin',
      isHR: role === 'hr' || role === 'admin',
      isManager: role === 'manager' || role === 'hr' || role === 'admin',
    },
  }
}

export function toRequestContext(auth: AuthUser, employee: EmployeeRow | null): RequestContext {
  return {
    auth,
    employee,
    employeeId: employee?.employee_id ?? null,
    role: employee?.role ?? null,
  }
}

export async function loadContext(auth: AuthUser): Promise<RequestContext> {
  const me = await linkAndLoadEmployee(auth)
  return toRequestContext(auth, me.accessStatus === 'ok' ? me.employee : null)
}

export async function isDirectReport(
  targetEmployeeId: string,
  managerEmployeeId: string
): Promise<boolean> {
  const result = await query<{ ok: number }>(
    `SELECT 1 AS ok FROM employees
     WHERE employee_id = $1 AND manager_id = $2 LIMIT 1`,
    [targetEmployeeId, managerEmployeeId]
  )
  return result.rowCount !== null && result.rowCount > 0
}
