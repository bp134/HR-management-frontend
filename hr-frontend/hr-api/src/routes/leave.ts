import { Router } from 'express'
import { query } from '../db.js'
import { canApproveLeave, leaveListFilter } from '../authorization/index.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'
import { isDirectReport, loadContext } from '../services/employeeContext.js'
import type { LeaveStatus } from '../types.js'

interface LeaveRow {
  leave_id: string
  employee_id: string
  approved_by: string | null
  status: LeaveStatus
  leave_type: string | null
  start_date: string | null
  end_date: string | null
  reason: string | null
  created_at: string | null
}

export const leaveRouter = Router()

leaveRouter.get('/', async (req: AuthenticatedRequest, res) => {
  const ctx = await loadContext(req.authUser!)
  if (!ctx.employeeId) {
    res.status(403).json({ error: 'forbidden', message: 'Not linked to an employee record' })
    return
  }

  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const filter = leaveListFilter(ctx)
  const conditions = [filter.sql]
  const params: unknown[] = [...filter.params]
  let i = params.length + 1

  if (status) {
    conditions.push(`lr.status = $${i}`)
    params.push(status)
    i++
  }

  const sql = `
    SELECT lr.*
    FROM leaverequests lr
    WHERE ${conditions.join(' AND ')}
    ORDER BY lr.created_at DESC NULLS LAST
  `

  const result = await query<LeaveRow>(sql, params)
  res.json({ requests: result.rows })
})

leaveRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const ctx = await loadContext(req.authUser!)
  if (!ctx.employeeId) {
    res.status(403).json({ error: 'forbidden', message: 'Not linked to an employee record' })
    return
  }

  const { start_date, end_date, leave_type, reason, employee_id } = req.body as {
    start_date?: string
    end_date?: string
    leave_type?: string
    reason?: string
    employee_id?: string
  }

  const targetId = employee_id ?? ctx.employeeId
  if (targetId !== ctx.employeeId && !(ctx.role === 'admin' || ctx.role === 'hr')) {
    res.status(403).json({ error: 'forbidden', message: 'You can only submit leave for yourself' })
    return
  }

  if (!start_date || !end_date) {
    res.status(400).json({ error: 'bad_request', message: 'start_date and end_date are required' })
    return
  }

  const inserted = await query<LeaveRow>(
    `INSERT INTO leaverequests (employee_id, status, leave_type, start_date, end_date, reason)
     VALUES ($1, 'pending', $2, $3, $4, $5)
     RETURNING *`,
    [targetId, leave_type ?? 'annual', start_date, end_date, reason ?? null]
  )

  res.status(201).json({ request: inserted.rows[0] })
})

leaveRouter.patch('/:id/status', async (req: AuthenticatedRequest, res) => {
  const ctx = await loadContext(req.authUser!)
  if (!ctx.employeeId) {
    res.status(403).json({ error: 'forbidden', message: 'Not linked to an employee record' })
    return
  }

  const { status } = req.body as { status?: 'approved' | 'rejected' }
  if (status !== 'approved' && status !== 'rejected') {
    res.status(400).json({ error: 'bad_request', message: 'status must be approved or rejected' })
    return
  }

  const existing = await query<LeaveRow>(
    'SELECT * FROM leaverequests WHERE leave_id = $1',
    [req.params.id]
  )
  const leave = existing.rows[0]
  if (!leave) {
    res.status(404).json({ error: 'not_found', message: 'Leave request not found' })
    return
  }

  if (leave.status !== 'pending') {
    res.status(400).json({ error: 'bad_request', message: 'Only pending requests can be updated' })
    return
  }

  const isTeam = await isDirectReport(leave.employee_id, ctx.employeeId)
  const canApprove =
    canApproveLeave(ctx, leave.employee_id) &&
    (ctx.role === 'admin' || ctx.role === 'hr' || isTeam)

  if (!canApprove) {
    res.status(403).json({ error: 'forbidden', message: 'You cannot approve this leave request' })
    return
  }

  const updated = await query<LeaveRow>(
    `UPDATE leaverequests
     SET status = $1, approved_by = $2
     WHERE leave_id = $3
     RETURNING *`,
    [status, ctx.employeeId, req.params.id]
  )

  res.json({ request: updated.rows[0] })
})
