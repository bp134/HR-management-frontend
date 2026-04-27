import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Employee } from '../types/database'

// Employees joined with their department name for display
export interface EmployeeWithDept extends Employee {
  department_name: string | null
  manager_name: string | null
}

interface UseEmployeesReturn {
  employees: EmployeeWithDept[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useEmployees(search = ''): UseEmployeesReturn {
  const [employees, setEmployees] = useState<EmployeeWithDept[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function fetch() {
      // RLS automatically filters to rows the current user can see.
      // We join departments for the department name.
      let query = supabase
        .from('employees')
        .select(`
          *,
          departments ( department_id ),
          managers:employees!employees_manager_id_fkey ( first_name, last_name )
        `)
        .order('last_name', { ascending: true })

      if (search.trim()) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,job_title.ilike.%${search}%`
        )
      }

      const { data, error: err } = await query

      if (cancelled) return

      if (err) {
        setError(err.message)
        setEmployees([])
      } else {
        // Flatten joined data
        const flat: EmployeeWithDept[] = (data ?? []).map((row: any) => ({
          ...row,
          department_name: row.departments ? String(row.departments.department_id ?? '') : null,
          manager_name: row.managers
            ? `${row.managers.first_name ?? ''} ${row.managers.last_name ?? ''}`.trim() || null
            : null,
        }))
        setEmployees(flat)
      }
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [search, tick])

  return { employees, loading, error, refresh }
}

// Single employee detail
export function useEmployee(employeeId: string | undefined) {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!employeeId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    supabase
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId)
      .single()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) { setError(err.message); setEmployee(null) }
        else setEmployee(data)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [employeeId])

  return { employee, loading, error }
}

// Update employee fields (admin/hr only — RLS enforced on server)
export async function updateEmployee(
  employeeId: string,
  fields: Partial<Omit<Employee, 'employee_id' | 'created_at' | 'user_id'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('employees')
    .update(fields)
    .eq('employee_id', employeeId)

  return { error: error?.message ?? null }
}
