import { useCallback, useEffect, useState } from 'react'
import { getEmployee, getEmployees, updateEmployeeApi } from '../lib/api'
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

    getEmployees(search)
      .then(({ employees: rows }) => {
        if (cancelled) return
        const flat: EmployeeWithDept[] = rows.map(row => ({
          ...row,
          department_name: null,
          manager_name: null,
        }))
        setEmployees(flat)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load employees')
        setEmployees([])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [search, tick])

  return { employees, loading, error, refresh }
}

export function useEmployee(employeeId: string | undefined) {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!employeeId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)

    getEmployee(employeeId)
      .then(({ employee: row }) => {
        if (cancelled) return
        setEmployee(row)
        setError(null)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load employee')
        setEmployee(null)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [employeeId, tick])

  return { employee, loading, error, refresh }
}

export async function updateEmployee(
  employeeId: string,
  fields: Partial<Omit<Employee, 'employee_id' | 'created_at' | 'user_id'>>
): Promise<{ error: string | null }> {
  try {
    await updateEmployeeApi(employeeId, fields as Record<string, unknown>)
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Update failed' }
  }
}
