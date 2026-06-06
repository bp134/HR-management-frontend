import { query } from '../db.js';
export async function linkAndLoadEmployee(auth) {
    const byOid = await query('SELECT * FROM employees WHERE user_id = $1 LIMIT 1', [auth.oid]);
    if (byOid.rows[0]) {
        return buildOk(byOid.rows[0]);
    }
    const byEmail = await query('SELECT * FROM employees WHERE lower(email) = lower($1) LIMIT 1', [auth.email]);
    const employee = byEmail.rows[0];
    if (!employee) {
        return {
            accessStatus: 'no_employee',
            employee: null,
            flags: null,
            message: 'No employee record found for this email',
        };
    }
    if (employee.user_id && employee.user_id !== auth.oid) {
        return {
            accessStatus: 'already_linked',
            employee: null,
            flags: null,
            message: 'Employee record already linked to a different account',
        };
    }
    if (!employee.user_id) {
        await query('UPDATE employees SET user_id = $1 WHERE employee_id = $2 AND (user_id IS NULL OR user_id = $1)', [auth.oid, employee.employee_id]);
        employee.user_id = auth.oid;
    }
    return buildOk(employee);
}
function buildOk(employee) {
    const role = employee.role;
    return {
        accessStatus: 'ok',
        employee,
        flags: {
            isAdmin: role === 'admin',
            isHR: role === 'hr' || role === 'admin',
            isManager: role === 'manager' || role === 'hr' || role === 'admin',
        },
    };
}
export function toRequestContext(auth, employee) {
    return {
        auth,
        employee,
        employeeId: employee?.employee_id ?? null,
        role: employee?.role ?? null,
    };
}
export async function loadContext(auth) {
    const me = await linkAndLoadEmployee(auth);
    return toRequestContext(auth, me.accessStatus === 'ok' ? me.employee : null);
}
export async function isDirectReport(targetEmployeeId, managerEmployeeId) {
    const result = await query(`SELECT 1 AS ok FROM employees
     WHERE employee_id = $1 AND manager_id = $2 LIMIT 1`, [targetEmployeeId, managerEmployeeId]);
    return result.rowCount !== null && result.rowCount > 0;
}
