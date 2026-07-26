import { Router } from 'express'
import { query } from '../db.js'
import {
  canUpdateEmployee,
  canViewEmployee,
  canViewEmployeeList,
  employeeListFilter,
  isAdminOrHr,
} from '../authorization/index.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'
import { loadContext } from '../services/employeeContext.js'
import type { EmployeeRow } from '../types.js'

export const employeesRouter = Router()

const SELF_EDITABLE = new Set([
  'first_name', 'last_name', 'email', 'phone', 'address',
  'emergency_contact_name', 'emergency_contact_phone',
  'job_title', 'employment_type', 'start_date', 'end_date',
])

const HR_CREATABLE = new Set([
  ...SELF_EDITABLE,
  'role', 'department_id', 'manager_id', 'date_of_birth',
])

const VALID_EMPLOYMENT_TYPES = new Set([
  'full-time', 'part-time', 'permanent', 'locum',
])

function validateEmploymentType(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !VALID_EMPLOYMENT_TYPES.has(value)) {
    return undefined
  }
  return value
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function routeParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0]
  return undefined
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

function emptyToNull(value: unknown): unknown {
  return value === '' || value === undefined ? null : value
}

employeesRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const ctx = await loadContext(req.authUser!)
  if (!isAdminOrHr(ctx.role)) {
    res.status(403).json({ error: 'forbidden', message: 'Only HR or admin can create employees' })
    return
  }

  const body = req.body as Record<string, unknown>
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'bad_request', message: 'Invalid body' })
    return
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'bad_request', message: 'A valid email is required' })
    return
  }

  const fields: Record<string, unknown> = { email: email.toLowerCase() }
  for (const key of HR_CREATABLE) {
    if (key === 'email' || body[key] === undefined) continue
    if (key === 'employment_type') {
      const validated = validateEmploymentType(body[key])
      if (validated === undefined) {
        res.status(400).json({
          error: 'bad_request',
          message: `employment_type must be one of: ${[...VALID_EMPLOYMENT_TYPES].join(', ')}`,
        })
        return
      }
      if (validated !== null) fields[key] = validated
      continue
    }
    fields[key] = emptyToNull(body[key])
  }

  const columns = ['employee_id', ...Object.keys(fields)]
  const values = ['gen_random_uuid()', ...Object.keys(fields).map((_, i) => `$${i + 1}`)]
  const params = Object.values(fields)

  const inserted = await query<EmployeeRow>(
    `INSERT INTO employees (${columns.join(', ')})
     VALUES (${values.join(', ')})
     RETURNING *`,
    params
  )

  res.status(201).json({ employee: inserted.rows[0] })
})

employeesRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const ctx = await loadContext(req.authUser!)
  if (!canViewEmployeeList(ctx)) {
    res.status(403).json({ error: 'forbidden', message: 'Insufficient permissions' })
    return
  }

  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const filter = employeeListFilter(ctx)
  const conditions = [filter.sql]
  const params: unknown[] = [...filter.params]
  let paramIndex = params.length + 1

  if (search) {
    const pattern = `%${search}%`
    conditions.push(`(
      e.first_name ILIKE $${paramIndex} OR
      e.last_name ILIKE $${paramIndex} OR
      e.email ILIKE $${paramIndex} OR
      e.job_title ILIKE $${paramIndex}
    )`)
    params.push(pattern)
    paramIndex++
  }

  const sql = `
    SELECT e.*
    FROM employees e
    WHERE ${conditions.join(' AND ')}
    ORDER BY e.last_name ASC NULLS LAST, e.first_name ASC NULLS LAST
  `

  const result = await query<EmployeeRow>(sql, params)
  res.json({ employees: result.rows })
})

employeesRouter.get('/:id', async (req: AuthenticatedRequest, res) => {
  const id = routeParam(req.params.id)
  if (!id || !isUuid(id)) {
    res.status(404).json({ error: 'not_found', message: 'Employee not found' })
    return
  }

  const ctx = await loadContext(req.authUser!)
  const result = await query<EmployeeRow>(
    'SELECT * FROM employees WHERE employee_id = $1',
    [id]
  )
  const employee = result.rows[0]
  if (!employee) {
    res.status(404).json({ error: 'not_found', message: 'Employee not found' })
    return
  }
  if (!canViewEmployee(ctx, employee)) {
    res.status(403).json({ error: 'forbidden', message: 'You do not have access to this employee' })
    return
  }
  res.json({ employee })
})

employeesRouter.patch('/:id', async (req: AuthenticatedRequest, res) => {
  const id = routeParam(req.params.id)
  if (!id || !isUuid(id)) {
    res.status(404).json({ error: 'not_found', message: 'Employee not found' })
    return
  }

  const ctx = await loadContext(req.authUser!)
  const result = await query<EmployeeRow>(
    'SELECT * FROM employees WHERE employee_id = $1',
    [id]
  )
  const employee = result.rows[0]
  if (!employee) {
    res.status(404).json({ error: 'not_found', message: 'Employee not found' })
    return
  }

  const body = req.body as Record<string, unknown>
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'bad_request', message: 'Invalid body' })
    return
  }

  const isHrAdmin = ctx.role === 'admin' || ctx.role === 'hr'
  const blockedKeys = new Set(['employee_id', 'created_at', 'user_id'])

  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || blockedKeys.has(key)) continue
    if (!(isHrAdmin || SELF_EDITABLE.has(key))) continue
    if (key === 'employment_type') {
      const validated = validateEmploymentType(value)
      if (validated === undefined) {
        res.status(400).json({
          error: 'bad_request',
          message: `employment_type must be one of: ${[...VALID_EMPLOYMENT_TYPES].join(', ')}`,
        })
        return
      }
      updates[key] = validated
      continue
    }
    updates[key] = value
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'bad_request', message: 'No valid fields to update' })
    return
  }

  const check = canUpdateEmployee(ctx, employee, updates)
  if (!check.allowed) {
    res.status(403).json({ error: 'forbidden', message: check.reason ?? 'Not allowed' })
    return
  }

  const setClauses: string[] = []
  const params: unknown[] = []
  let i = 1
  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${i}`)
    params.push(value === '' ? null : value)
    i++
  }
  params.push(id)

  const updated = await query<EmployeeRow>(
    `UPDATE employees SET ${setClauses.join(', ')} WHERE employee_id = $${i} RETURNING *`,
    params
  )

  res.json({ employee: updated.rows[0] })
})
