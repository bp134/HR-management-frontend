import type { Employee, LeaveRequest, LeaveStatus } from '../types/database'

const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

let tokenGetter: (() => Promise<string | null>) | null = null

export function setApiTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!baseUrl) {
    throw new ApiError(
      'VITE_API_BASE_URL is not set. Add it to hr-frontend/.env and restart the dev server.',
      0,
      'config'
    )
  }

  const token = tokenGetter ? await tokenGetter() : null
  if (!token) {
    throw new ApiError(
      'Could not get an API access token. Sign out, then sign in again and accept the API permission prompt.',
      401,
      'no_token'
    )
  }

  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(
      `Network error reaching ${baseUrl}. Is the API running on port 3001?`,
      0,
      'network'
    )
  }

  if (!res.ok) {
    let message = res.statusText
    let code: string | undefined
    try {
      const body = await res.json() as { message?: string; error?: string }
      message = body.message ?? message
      code = body.error
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, code)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export type AccessStatus = 'ok' | 'no_employee' | 'already_linked'

export interface MeResponse {
  accessStatus: AccessStatus
  employee: Employee | null
  flags: {
    isAdmin: boolean
    isHR: boolean
    isManager: boolean
  } | null
  message?: string
}

export function getMe() {
  return apiFetch<MeResponse>('/api/me')
}

export function getEmployees(search = '') {
  const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return apiFetch<{ employees: Employee[] }>(`/api/employees${q}`)
}

export function getEmployee(id: string) {
  return apiFetch<{ employee: Employee }>(`/api/employees/${id}`)
}

export function createEmployeeApi(fields: Record<string, unknown>) {
  return apiFetch<{ employee: Employee }>('/api/employees', {
    method: 'POST',
    body: JSON.stringify(fields),
  })
}

export function updateEmployeeApi(
  id: string,
  fields: Record<string, unknown>
) {
  return apiFetch<{ employee: Employee }>(`/api/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  })
}

export function getLeaveRequests(status?: LeaveStatus) {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiFetch<{ requests: LeaveRequest[] }>(`/api/leave-requests${q}`)
}

export function submitLeaveRequestApi(body: {
  employee_id?: string
  leave_type?: string
  start_date: string
  end_date: string
}) {
  return apiFetch<{ request: LeaveRequest }>('/api/leave-requests', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateLeaveStatusApi(
  leaveId: string,
  status: 'approved' | 'rejected'
) {
  return apiFetch<{ request: LeaveRequest }>(`/api/leave-requests/${leaveId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export interface DashboardStats {
  totalEmployees: number
  pendingLeave: number
  activeContracts: number
  isManagerView: boolean
}

export function getDashboardStats() {
  return apiFetch<DashboardStats>('/api/dashboard/stats')
}
