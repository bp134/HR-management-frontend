import { Router } from 'express'
import type { PoolClient } from 'pg'
import { query, withTransaction } from '../db.js'
import {
  canUpdateEmployee,
  canViewEmployee,
  canViewEmployeeList,
  employeeListFilter,
  isAdminOrHr,
} from '../authorization/index.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'
import { loadContext } from '../services/employeeContext.js'
import {
  CONTRACTS_CONTAINER,
  DOCUMENTS_CONTAINER,
  getSignedUrl,
} from '../services/blobStorage.js'
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

  if (body.role === 'admin' && ctx.role !== 'admin') {
    res.status(403).json({ error: 'forbidden', message: 'Only an admin can create an admin' })
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

// GET /api/employees/archived — HR/admin only. Archived employee summaries.
// Must be declared before /:id so "archived" is not treated as an employee id.
employeesRouter.get('/archived', async (req: AuthenticatedRequest, res) => {
  const ctx = await loadContext(req.authUser!)
  if (!isAdminOrHr(ctx.role)) {
    res.status(403).json({ error: 'forbidden', message: 'Only HR or admin can view archived employees' })
    return
  }

  const result = await query(
    `SELECT a.*,
            (SELECT COUNT(*)::int FROM archived_employee_records r
              WHERE r.employee_archive_id = a.archive_id) AS record_count
     FROM archived_employees a
     ORDER BY a.archived_at DESC
     LIMIT 500`
  )
  res.json({ archived: result.rows })
})

// GET /api/employees/archived/:archiveId — HR/admin only. Full archived detail.
employeesRouter.get('/archived/:archiveId', async (req: AuthenticatedRequest, res) => {
  const archiveId = routeParam(req.params.archiveId)
  if (!archiveId || !isUuid(archiveId)) {
    res.status(404).json({ error: 'not_found', message: 'Archive record not found' })
    return
  }

  const ctx = await loadContext(req.authUser!)
  if (!isAdminOrHr(ctx.role)) {
    res.status(403).json({ error: 'forbidden', message: 'Only HR or admin can view archived employees' })
    return
  }

  const employee = await query(
    'SELECT * FROM archived_employees WHERE archive_id = $1',
    [archiveId]
  )
  if (!employee.rows[0]) {
    res.status(404).json({ error: 'not_found', message: 'Archive record not found' })
    return
  }

  const records = await query(
    `SELECT record_type, record_id, payload, archived_at
     FROM archived_employee_records
     WHERE employee_archive_id = $1
     ORDER BY record_type ASC, archived_at ASC`,
    [archiveId]
  )

  res.json({ employee: employee.rows[0], records: records.rows })
})

// GET /api/employees/archived/:archiveId/records/:recordId/download
// HR/admin only. Archived files stay in Azure Blob Storage, so this returns a
// short-lived signed URL using the path captured in the archive payload.
employeesRouter.get(
  '/archived/:archiveId/records/:recordId/download',
  async (req: AuthenticatedRequest, res) => {
    const archiveId = routeParam(req.params.archiveId)
    const recordId = routeParam(req.params.recordId)
    if (!archiveId || !recordId || !isUuid(archiveId) || !isUuid(recordId)) {
      res.status(404).json({ error: 'not_found', message: 'Archived file not found' })
      return
    }

    const ctx = await loadContext(req.authUser!)
    if (!isAdminOrHr(ctx.role)) {
      res.status(403).json({ error: 'forbidden', message: 'Only HR or admin can access archived files' })
      return
    }

    const result = await query<{
      record_type: string
      payload: { file_path?: string | null; file_name?: string | null }
    }>(
      `SELECT record_type, payload
       FROM archived_employee_records
       WHERE employee_archive_id = $1
         AND record_id = $2
         AND record_type IN ('contract', 'document')
       ORDER BY archived_at DESC
       LIMIT 1`,
      [archiveId, recordId]
    )

    const record = result.rows[0]
    const filePath = record?.payload?.file_path
    if (!record || !filePath) {
      res.status(404).json({ error: 'not_found', message: 'Archived file not found' })
      return
    }

    const container = record.record_type === 'contract'
      ? CONTRACTS_CONTAINER
      : DOCUMENTS_CONTAINER

    try {
      const url = await getSignedUrl(container, filePath, 60)
      res.json({ url, file_name: record.payload.file_name ?? null })
    } catch (err) {
      console.error('Archived SAS generation failed:', err)
      res.status(500).json({ error: 'server_error', message: 'Could not generate download link' })
    }
  }
)

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

  if (ctx.role !== 'admin' && employee.role === 'admin' && 'role' in updates) {
    res.status(403).json({ error: 'forbidden', message: "Only an admin can change an admin's role" })
    return
  }
  if (ctx.role !== 'admin' && updates.role === 'admin') {
    res.status(403).json({ error: 'forbidden', message: 'Only an admin can assign the admin role' })
    return
  }
  if (id === ctx.employeeId && 'role' in updates && updates.role !== employee.role) {
    res.status(400).json({ error: 'bad_request', message: 'You cannot change your own role' })
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

/**
 * Remove an employee from the active directory, revoking access immediately.
 *
 * GDPR/legal retention: the employee row and every related record are copied
 * to archived_employees / archived_employee_records in the same transaction
 * before the active rows are deleted. Azure Blob files are deliberately kept.
 *
 * Only HR/admin can delete. HR cannot delete an admin, and the last admin
 * account cannot be deleted.
 */
employeesRouter.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const id = routeParam(req.params.id)
  if (!id || !isUuid(id)) {
    res.status(404).json({ error: 'not_found', message: 'Employee not found' })
    return
  }

  const ctx = await loadContext(req.authUser!)
  if (!isAdminOrHr(ctx.role)) {
    res.status(403).json({ error: 'forbidden', message: 'Only HR or admin can delete employees' })
    return
  }
  if (ctx.employeeId === id) {
    res.status(400).json({ error: 'bad_request', message: 'You cannot delete your own employee record' })
    return
  }

  const body = req.body as Record<string, unknown> | undefined
  const reason = typeof body?.reason === 'string' && body.reason.trim()
    ? body.reason.trim().slice(0, 500)
    : null

  const outcome = await withTransaction(async client => {
    const found = await client.query<EmployeeRow>(
      'SELECT * FROM employees WHERE employee_id = $1 FOR UPDATE',
      [id]
    )
    const employee = found.rows[0]
    if (!employee) {
      return { ok: false as const, status: 404, message: 'Employee not found' }
    }

    if (employee.role === 'admin' && ctx.role !== 'admin') {
      return { ok: false as const, status: 403, message: 'Only an admin can delete an admin' }
    }
    if (employee.role === 'admin') {
      const admins = await client.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM employees WHERE role = 'admin'"
      )
      if (parseInt(admins.rows[0]?.count ?? '0', 10) <= 1) {
        return { ok: false as const, status: 400, message: 'Cannot delete the last admin' }
      }
    }

    // 1. Snapshot the employee row.
    const archived = await client.query<{ archive_id: string }>(
      `INSERT INTO archived_employees (
         employee_id, first_name, last_name, date_of_birth, email, phone, address,
         emergency_contact_name, emergency_contact_phone, department_id, manager_id,
         job_title, employment_type, start_date, end_date, created_at, user_id, role,
         archived_by, archived_by_email, reason
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
       ) RETURNING archive_id`,
      [
        employee.employee_id,
        employee.first_name,
        employee.last_name,
        employee.date_of_birth,
        employee.email,
        employee.phone,
        employee.address,
        employee.emergency_contact_name,
        employee.emergency_contact_phone,
        employee.department_id,
        employee.manager_id,
        employee.job_title,
        employee.employment_type,
        employee.start_date,
        employee.end_date,
        employee.created_at,
        employee.user_id,
        employee.role,
        ctx.auth.oid,
        ctx.auth.email,
        reason,
      ]
    )
    const archiveId = archived.rows[0].archive_id

    // 2. Snapshot every record owned by this employee.
    const ownedTables = [
      { table: 'contracts', recordType: 'contract', idColumn: 'contract_id' },
      { table: 'documents', recordType: 'document', idColumn: 'document_id' },
      { table: 'leaverequests', recordType: 'leave_request', idColumn: 'leave_id' },
      { table: 'leavebalances', recordType: 'leave_balance', idColumn: 'balance_id' },
      { table: 'attendance', recordType: 'attendance', idColumn: 'attendance_id' },
      { table: 'performancereviews', recordType: 'performance_review', idColumn: 'review_id' },
      { table: 'disciplinaryrecords', recordType: 'disciplinary_record', idColumn: 'record_id' },
    ] as const

    for (const entry of ownedTables) {
      const rows = await client.query<Record<string, unknown>>(
        `SELECT * FROM ${entry.table} WHERE employee_id = $1 FOR UPDATE`,
        [id]
      )
      for (const row of rows.rows) {
        await archiveRecord(
          client,
          archiveId,
          id,
          entry.recordType,
          row[entry.idColumn],
          row
        )
      }
    }

    // 3. Snapshot references held by other active records, then clear them so
    //    deleting this employee cannot cascade into someone else's records.
    const directReports = await client.query<Record<string, unknown>>(
      'SELECT employee_id, manager_id FROM employees WHERE manager_id = $1 FOR UPDATE',
      [id]
    )
    for (const row of directReports.rows) {
      await archiveRecord(client, archiveId, id, 'managed_employee', row.employee_id, row)
    }

    const approvals = await client.query<Record<string, unknown>>(
      `SELECT leave_id, employee_id, leave_type, start_date, end_date, status,
              approved_by, created_at
       FROM leaverequests WHERE approved_by = $1 FOR UPDATE`,
      [id]
    )
    for (const row of approvals.rows) {
      await archiveRecord(client, archiveId, id, 'leave_approval', row.leave_id, row)
    }

    const reviewsConducted = await client.query<Record<string, unknown>>(
      `SELECT review_id, employee_id, reviewer_id, review_date, rating
       FROM performancereviews WHERE reviewer_id = $1 FOR UPDATE`,
      [id]
    )
    for (const row of reviewsConducted.rows) {
      await archiveRecord(client, archiveId, id, 'review_conducted', row.review_id, row)
    }

    await client.query('UPDATE employees SET manager_id = NULL WHERE manager_id = $1', [id])
    await client.query('UPDATE leaverequests SET approved_by = NULL WHERE approved_by = $1', [id])
    await client.query('UPDATE performancereviews SET reviewer_id = NULL WHERE reviewer_id = $1', [id])

    // 4. Remove the active rows. Azure Blob files are retained.
    for (const entry of ownedTables) {
      await client.query(`DELETE FROM ${entry.table} WHERE employee_id = $1`, [id])
    }
    await client.query('DELETE FROM employees WHERE employee_id = $1', [id])

    return { ok: true as const, archiveId }
  })

  if (!outcome.ok) {
    const error = outcome.status === 404
      ? 'not_found'
      : outcome.status === 403
        ? 'forbidden'
        : 'bad_request'
    res.status(outcome.status).json({ error, message: outcome.message })
    return
  }

  res.json({ success: true, archiveId: outcome.archiveId })
})

async function archiveRecord(
  client: PoolClient,
  employeeArchiveId: string,
  employeeId: string,
  recordType: string,
  recordId: unknown,
  payload: unknown
): Promise<void> {
  await client.query(
    `INSERT INTO archived_employee_records
       (employee_archive_id, employee_id, record_type, record_id, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      employeeArchiveId,
      employeeId,
      recordType,
      typeof recordId === 'string' ? recordId : null,
      JSON.stringify(payload),
    ]
  )
}
