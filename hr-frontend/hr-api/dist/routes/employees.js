import { Router } from 'express';
import { query } from '../db.js';
import { canUpdateEmployee, canViewEmployee, canViewEmployeeList, employeeListFilter, } from '../authorization/index.js';
import { loadContext } from '../services/employeeContext.js';
export const employeesRouter = Router();
const SELF_EDITABLE = new Set([
    'first_name', 'last_name', 'email', 'phone', 'address',
    'emergency_contact_name', 'emergency_contact_phone',
    'job_title', 'employment_type', 'start_date', 'end_date',
]);
employeesRouter.get('/', async (req, res) => {
    const ctx = await loadContext(req.authUser);
    if (!canViewEmployeeList(ctx)) {
        res.status(403).json({ error: 'forbidden', message: 'Insufficient permissions' });
        return;
    }
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const filter = employeeListFilter(ctx);
    const conditions = [filter.sql];
    const params = [...filter.params];
    let paramIndex = params.length + 1;
    if (search) {
        const pattern = `%${search}%`;
        conditions.push(`(
      e.first_name ILIKE $${paramIndex} OR
      e.last_name ILIKE $${paramIndex} OR
      e.email ILIKE $${paramIndex} OR
      e.job_title ILIKE $${paramIndex}
    )`);
        params.push(pattern);
        paramIndex++;
    }
    const sql = `
    SELECT e.*
    FROM employees e
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.last_name ASC NULLS LAST, e.first_name ASC NULLS LAST
  `;
    const result = await query(sql, params);
    res.json({ employees: result.rows });
});
employeesRouter.get('/:id', async (req, res) => {
    const ctx = await loadContext(req.authUser);
    const result = await query('SELECT * FROM employees WHERE employee_id = $1', [req.params.id]);
    const employee = result.rows[0];
    if (!employee) {
        res.status(404).json({ error: 'not_found', message: 'Employee not found' });
        return;
    }
    if (!canViewEmployee(ctx, employee)) {
        res.status(403).json({ error: 'forbidden', message: 'You do not have access to this employee' });
        return;
    }
    res.json({ employee });
});
employeesRouter.patch('/:id', async (req, res) => {
    const ctx = await loadContext(req.authUser);
    const result = await query('SELECT * FROM employees WHERE employee_id = $1', [req.params.id]);
    const employee = result.rows[0];
    if (!employee) {
        res.status(404).json({ error: 'not_found', message: 'Employee not found' });
        return;
    }
    const body = req.body;
    if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'bad_request', message: 'Invalid body' });
        return;
    }
    const isHrAdmin = ctx.role === 'admin' || ctx.role === 'hr';
    const blockedKeys = new Set(['employee_id', 'created_at', 'user_id']);
    const updates = {};
    for (const [key, value] of Object.entries(body)) {
        if (value === undefined || blockedKeys.has(key))
            continue;
        if (isHrAdmin || SELF_EDITABLE.has(key)) {
            updates[key] = value;
        }
    }
    if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'bad_request', message: 'No valid fields to update' });
        return;
    }
    const check = canUpdateEmployee(ctx, employee, updates);
    if (!check.allowed) {
        res.status(403).json({ error: 'forbidden', message: check.reason ?? 'Not allowed' });
        return;
    }
    const setClauses = [];
    const params = [];
    let i = 1;
    for (const [key, value] of Object.entries(updates)) {
        setClauses.push(`${key} = $${i}`);
        params.push(value === '' ? null : value);
        i++;
    }
    params.push(req.params.id);
    const updated = await query(`UPDATE employees SET ${setClauses.join(', ')} WHERE employee_id = $${i} RETURNING *`, params);
    res.json({ employee: updated.rows[0] });
});
