// Auto-generated types matching your Supabase schema.
// Re-run `supabase gen types typescript` after schema changes.

export type Role = 'admin' | 'hr' | 'manager' | 'employee'
export type EmploymentType = 'full-time' | 'part-time' | 'permanent' | 'locum'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

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
  // Added by migration
  user_id: string | null
  role: Role
}

export interface Department {
  department_id: string
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

// Supabase Database type for createClient generic
export interface Database {
  public: {
    Tables: {
      employees: {
        Row: Employee
        Insert: Omit<Employee, 'employee_id' | 'created_at'>
        Update: Partial<Omit<Employee, 'employee_id'>>
      }
      departments: {
        Row: Department
        Insert: Omit<Department, 'department_id'>
        Update: Partial<Omit<Department, 'department_id'>>
      }
      contracts: {
        Row: Contract
        Insert: Omit<Contract, 'contract_id'>
        Update: Partial<Omit<Contract, 'contract_id'>>
      }
      leaverequests: {
        Row: LeaveRequest
        Insert: Omit<LeaveRequest, 'leave_id'>
        Update: Partial<Omit<LeaveRequest, 'leave_id'>>
      }
      leavebalances: {
        Row: LeaveBalance
        Insert: Omit<LeaveBalance, 'balance_id'>
        Update: Partial<Omit<LeaveBalance, 'balance_id'>>
      }
      attendance: {
        Row: Attendance
        Insert: Omit<Attendance, 'attendance_id'>
        Update: Partial<Omit<Attendance, 'attendance_id'>>
      }
      performancereviews: {
        Row: PerformanceReview
        Insert: Omit<PerformanceReview, 'review_id'>
        Update: Partial<Omit<PerformanceReview, 'review_id'>>
      }
      documents: {
        Row: Document
        Insert: Omit<Document, 'document_id'>
        Update: Partial<Omit<Document, 'document_id'>>
      }
      disciplinaryrecords: {
        Row: DisciplinaryRecord
        Insert: Omit<DisciplinaryRecord, 'record_id'>
        Update: Partial<Omit<DisciplinaryRecord, 'record_id'>>
      }
    }
    Functions: {
      get_my_employee_id: { Returns: string | null }
      get_my_role: { Returns: string | null }
      link_employee_to_auth: { Returns: { status: string; message?: string; employee_id?: string; role?: string } }
    }
  }
}
