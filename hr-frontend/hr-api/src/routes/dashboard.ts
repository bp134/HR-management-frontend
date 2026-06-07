import { Router } from 'express'
import { query } from '../db.js'
import { employeeListFilter, isAdminOrHr, leaveListFilter } from '../authorization/index.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'
import { loadContext } from '../services/employeeContext.js'

export const dashboardRouter = Router()

dashboardRouter.get('/stats', async (req: AuthenticatedRequest, res) => {
  const ctx = await loadContext(req.authUser!)
  if (!ctx.employeeId || !ctx.role) {
    res.status(403).json({ error: 'forbidden', message: 'Not linked to an employee record' })
    return
  }

  const empFilter = employeeListFilter(ctx)
  const leaveFilter = leaveListFilter(ctx)

  const [empCount, leaveCount] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM employees e WHERE ${empFilter.sql}`,
      empFilter.params
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM leaverequests lr
       WHERE ${leaveFilter.sql} AND lr.status = 'pending'`,
      leaveFilter.params
    ),
  ])

  res.json({
    totalEmployees: parseInt(empCount.rows[0]?.count ?? '0', 10),
    pendingLeave: parseInt(leaveCount.rows[0]?.count ?? '0', 10),
    activeContracts: 0,
    isManagerView: ctx.role === 'manager' || isAdminOrHr(ctx.role),
  })
})
