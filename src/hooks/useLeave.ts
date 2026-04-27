import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { LeaveRequest, LeaveStatus } from '../types/database'

export interface LeaveRequestWithEmployee extends LeaveRequest {
  employee_first_name: string | null
  employee_last_name: string | null
  employee_email: string | null
}

interface UseLeaveReturn {
  requests: LeaveRequestWithEmployee[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useLeaveRequests(statusFilter?: LeaveStatus): UseLeaveReturn {
  const [requests, setRequests] = useState<LeaveRequestWithEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function fetch() {
      let query = supabase
        .from('leaverequests')
        .select(`
          *,
          employees!leaverequests_employee_id_fkey ( first_name, last_name, email )
        `)
        .order('created_at' as any, { ascending: false })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error: err } = await query

      if (cancelled) return

      if (err) {
        setError(err.message)
        setRequests([])
      } else {
        const flat: LeaveRequestWithEmployee[] = (data ?? []).map((row: any) => ({
          ...row,
          employee_first_name: row.employees?.first_name ?? null,
          employee_last_name: row.employees?.last_name ?? null,
          employee_email: row.employees?.email ?? null,
        }))
        setRequests(flat)
      }
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [statusFilter, tick])

  return { requests, loading, error, refresh }
}

// Submit a new leave request for the current employee
export async function submitLeaveRequest(fields: {
  employee_id: string
  leave_type?: string
  start_date: string
  end_date: string
  reason?: string
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('leaverequests').insert({
    ...fields,
    status: 'pending',
  })
  return { error: error?.message ?? null }
}

// Approve or reject a leave request (manager/admin — RLS enforced on server)
export async function updateLeaveStatus(
  leaveId: string,
  status: 'approved' | 'rejected',
  approvedBy: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('leaverequests')
    .update({ status, approved_by: approvedBy })
    .eq('leave_id', leaveId)

  return { error: error?.message ?? null }
}
