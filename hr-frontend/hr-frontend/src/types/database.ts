export type Role = 'admin' | 'hr' | 'manager' | 'employee'
export type EmploymentType = 'full-time' | 'part-time' | 'permanent' | 'locum'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

/** Matches PostgreSQL enum `employment_type` — see database/schema/schema.md */
export const EMPLOYMENT_TYPE_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'full-time', label: 'Full time' },
  { value: 'part-time', label: 'Part time' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'locum', label: 'Locum' },
]

export function formatEmploymentType(value: string | null | undefined): string {
  if (!value) return '—'
  return value.replace(/-/g, ' ')
}

export interface Employee {
  employee_id: string
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
  email: string | null
  phone: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  department_id: string | null
  manager_id: string | null
  job_title: string | null
  employment_type: EmploymentType | null
  start_date: string | null
  end_date: string | null
  created_at: string | null
  user_id: string | null
  role: Role
}

export interface Department {
  department_id: string
  name?: string | null
  [key: string]: unknown
}

export interface Contract {
  contract_id: string
  employee_id: string
  [key: string]: unknown
}

export interface LeaveRequest {
  leave_id: string
  employee_id: string
  approved_by: string | null
  status: LeaveStatus
  leave_type: string | null
  start_date: string | null
  end_date: string | null
  created_at?: string | null
  [key: string]: unknown
}

export interface LeaveBalance {
  balance_id: string
  employee_id: string
  [key: string]: unknown
}

export interface Attendance {
  attendance_id: string
  employee_id: string
  [key: string]: unknown
}

export interface PerformanceReview {
  review_id: string
  employee_id: string
  reviewer_id: string
  [key: string]: unknown
}

export interface Document {
  document_id: string
  employee_id: string
  [key: string]: unknown
}

export interface DisciplinaryRecord {
  record_id: string
  employee_id: string
  incident_date: string
  [key: string]: unknown
}

