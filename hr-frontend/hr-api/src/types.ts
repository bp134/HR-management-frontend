export type Role = 'admin' | 'hr' | 'manager' | 'employee'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface EmployeeRow {
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
  employment_type: string | null
  start_date: string | null
  end_date: string | null
  created_at: string | null
  user_id: string | null
  role: Role
}

export interface AuthUser {
  oid: string
  email: string | null
}

export interface RequestContext {
  auth: AuthUser
  employee: EmployeeRow | null
  employeeId: string | null
  role: Role | null
}
