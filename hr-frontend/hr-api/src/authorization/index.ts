import type { EmployeeRow, RequestContext, Role } from '../types.js'

export function isAdminOrHr(role: Role | null): boolean {
  return role === 'admin' || role === 'hr'
}

export function isManagerPlus(role: Role | null): boolean {
  return role === 'manager' || isAdminOrHr(role)
}

export function canViewEmployeeList(ctx: RequestContext): boolean {
  return isManagerPlus(ctx.role)
}

export function canViewEmployee(ctx: RequestContext, target: EmployeeRow): boolean {
  if (!ctx.employeeId || !ctx.role) return false
  if (isAdminOrHr(ctx.role)) return true
  if (target.employee_id === ctx.employeeId) return true
  if (ctx.role === 'manager' && target.manager_id === ctx.employeeId) return true
  return false
}

export function canUpdateEmployee(
  ctx: RequestContext,
  target: EmployeeRow,
  fields: Record<string, unknown>
): { allowed: boolean; reason?: string } {
  if (!ctx.employeeId || !ctx.role) {
    return { allowed: false, reason: 'Not linked to an employee record' }
  }

  if (!canViewEmployee(ctx, target)) {
    return { allowed: false, reason: 'You do not have access to this employee' }
  }

  const restricted = ['role', 'user_id', 'manager_id', 'department_id', 'date_of_birth', 'created_at', 'employee_id']
  const updating = Object.keys(fields)

  if (isAdminOrHr(ctx.role)) {
    return { allowed: true }
  }

  if (target.employee_id !== ctx.employeeId) {
    return { allowed: false, reason: 'Only HR or admin can edit other employees' }
  }

  const blocked = updating.filter(k => restricted.includes(k))
  if (blocked.length > 0) {
    return { allowed: false, reason: `You cannot update: ${blocked.join(', ')}` }
  }

  return { allowed: true }
}

export function employeeListFilter(ctx: RequestContext): {
  sql: string
  params: unknown[]
} {
  if (!ctx.employeeId || !ctx.role) {
    return { sql: '1 = 0', params: [] }
  }
  if (isAdminOrHr(ctx.role)) {
    return { sql: '1 = 1', params: [] }
  }
  if (ctx.role === 'manager') {
    return {
      sql: '(e.employee_id = $1 OR e.manager_id = $1)',
      params: [ctx.employeeId],
    }
  }
  return {
    sql: 'e.employee_id = $1',
    params: [ctx.employeeId],
  }
}

export function leaveListFilter(ctx: RequestContext): {
  sql: string
  params: unknown[]
} {
  if (!ctx.employeeId || !ctx.role) {
    return { sql: '1 = 0', params: [] }
  }
  if (isAdminOrHr(ctx.role)) {
    return { sql: '1 = 1', params: [] }
  }
  if (ctx.role === 'manager') {
    return {
      sql: `(lr.employee_id = $1 OR lr.employee_id IN (
        SELECT employee_id FROM employees WHERE manager_id = $1
      ))`,
      params: [ctx.employeeId],
    }
  }
  return {
    sql: 'lr.employee_id = $1',
    params: [ctx.employeeId],
  }
}

export async function canManageLeaveForEmployee(
  ctx: RequestContext,
  targetEmployeeId: string,
  isDirectDbCheck: (employeeId: string, managerId: string) => Promise<boolean>
): Promise<boolean> {
  if (!ctx.employeeId || !ctx.role) return false
  if (isAdminOrHr(ctx.role)) return true
  if (targetEmployeeId === ctx.employeeId) return true
  if (ctx.role === 'manager') {
    return isDirectDbCheck(targetEmployeeId, ctx.employeeId)
  }
  return false
}

export function canApproveLeave(ctx: RequestContext, targetEmployeeId: string): boolean {
  if (!ctx.role || !ctx.employeeId) return false
  if (isAdminOrHr(ctx.role)) return true
  if (ctx.role === 'manager' && targetEmployeeId !== ctx.employeeId) return true
  return false
}
