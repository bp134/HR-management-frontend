import type { Employee, LeaveRequest, LeaveStatus } from '../types/database'

const renderApiBaseUrl = 'https://hr-management-frontend-gz9u.onrender.com'
const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

function pointsAtStaticWebApp(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith('.azurestaticapps.net')
  } catch {
    return false
  }
}

const baseUrl = configuredBaseUrl && !pointsAtStaticWebApp(configuredBaseUrl)
  ? configuredBaseUrl
  : renderApiBaseUrl

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
      'VITE_API_BASE_URL is not set. For production it should point to the Render API URL.',
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
      `Network error reaching ${baseUrl}. Check the Render service is running and CORS_ORIGINS includes this Static Web App URL.`,
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

// ── Contracts ──────────────────────────────────────────────────

export interface Contract {
  contract_id: string
  employee_id: string
  file_path: string | null
  file_name: string | null
  contract_type: string | null
  salary: number | null
  hourly_rate: number | null
  contracted_hours: number | null
  start_date: string | null
  end_date: string | null
}

export function getContracts(employeeId?: string) {
  const q = employeeId ? `?employee_id=${encodeURIComponent(employeeId)}` : ''
  return apiFetch<{ contracts: Contract[] }>(`/api/contracts${q}`)
}

export function getContractDownloadUrl(contractId: string) {
  return apiFetch<{ url: string }>(`/api/contracts/${contractId}/download`)
}

export async function uploadContractApi(
  employeeId: string,
  file: File,
  meta: {
    contract_type?: string
    salary?: string
    hourly_rate?: string
    contracted_hours?: string
    start_date?: string
    end_date?: string
  }
): Promise<{ contract: Contract }> {
  // FormData — must NOT set Content-Type so browser sets multipart boundary
  const form = new FormData()
  form.append('file', file)
  form.append('employee_id', employeeId)
  Object.entries(meta).forEach(([k, v]) => { if (v) form.append(k, v) })

  const token = tokenGetter ? await tokenGetter() : null
  if (!token) {
    throw new ApiError(
      'Could not get an API access token.',
      401,
      'no_token'
    )
  }

  let res: Response
  try {
    res = await fetch(`${baseUrl}/api/contracts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
  } catch {
    throw new ApiError('Network error during upload.', 0, 'network')
  }

  if (!res.ok) {
    let message = res.statusText
    let code: string | undefined
    try {
      const body = await res.json() as { message?: string; error?: string }
      message = body.message ?? message
      code = body.error
    } catch { /* ignore */ }
    throw new ApiError(message, res.status, code)
  }

  return res.json() as Promise<{ contract: Contract }>
}

export function deleteContractApi(contractId: string) {
  return apiFetch<{ success: boolean }>(`/api/contracts/${contractId}`, {
    method: 'DELETE',
  })
}

// ── Documents ──────────────────────────────────────────────────

export interface Document {
  document_id: string
  employee_id: string
  document_type: string | null
  file_path: string | null
  file_name: string | null
  uploaded_at: string | null
}

export const DOCUMENT_TYPES = [
  'Passport',
  'Right to Work',
  'DBS Certificate',
  'GPhC Registration',
  'Professional Indemnity',
  'Training Certificate',
  'Other',
] as const

export function getDocuments(employeeId?: string) {
  const q = employeeId ? `?employee_id=${encodeURIComponent(employeeId)}` : ''
  return apiFetch<{ documents: Document[] }>(`/api/documents${q}`)
}

export function getDocumentDownloadUrl(documentId: string) {
  return apiFetch<{ url: string }>(`/api/documents/${documentId}/download`)
}

export async function uploadDocumentApi(
  employeeId: string,
  file: File,
  documentType: string
): Promise<{ document: Document }> {
  // FormData — must NOT set Content-Type
  const form = new FormData()
  form.append('file', file)
  form.append('employee_id', employeeId)
  form.append('document_type', documentType)

  const token = tokenGetter ? await tokenGetter() : null
  if (!token) {
    throw new ApiError('Could not get an API access token.', 401, 'no_token')
  }

  let res: Response
  try {
    res = await fetch(`${baseUrl}/api/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
  } catch {
    throw new ApiError('Network error during upload.', 0, 'network')
  }

  if (!res.ok) {
    let message = res.statusText
    let code: string | undefined
    try {
      const body = await res.json() as { message?: string; error?: string }
      message = body.message ?? message
      code = body.error
    } catch { /* ignore */ }
    throw new ApiError(message, res.status, code)
  }

  return res.json() as Promise<{ document: Document }>
}

export function deleteDocumentApi(documentId: string) {
  return apiFetch<{ success: boolean }>(`/api/documents/${documentId}`, {
    method: 'DELETE',
  })
}