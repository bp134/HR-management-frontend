import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Employee } from '../types/database'

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

    async function fetchEmployees() {
      let query = supabase
        .from('employees')
        .select('*')
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
        const flat: EmployeeWithDept[] = ((data ?? []) as Employee[]).map(row => ({
          ...row,
          department_name: null,
          manager_name: null,
        }))
        setEmployees(flat)
      }
      setLoading(false)
    }

    fetchEmployees()
    return () => { cancelled = true }
  }, [search, tick])

  return { employees, loading, error, refresh }
}

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
        else setEmployee(data as Employee)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [employeeId])

  return { employee, loading, error }
}

export async function updateEmployee(
  employeeId: string,
  fields: Partial<Omit<Employee, 'employee_id' | 'created_at' | 'user_id'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('employees')
    .update(fields as Record<string, unknown>)
    .eq('employee_id', employeeId)

  return { error: error?.message ?? null }
}
