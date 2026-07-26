import { useCallback, useEffect, useState } from 'react'
import {
  getLeaveRequests,
  submitLeaveRequestApi,
  updateLeaveStatusApi,
} from '../lib/api'
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

    getLeaveRequests(statusFilter)
      .then(({ requests: rows }) => {
        if (cancelled) return
        const flat: LeaveRequestWithEmployee[] = rows.map(row => ({
          ...row,
          employee_first_name: null,
          employee_last_name: null,
          employee_email: null,
        }))
        setRequests(flat)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load leave requests')
        setRequests([])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [statusFilter, tick])

  return { requests, loading, error, refresh }
}

export async function submitLeaveRequest(fields: {
  employee_id: string
  leave_type?: string
  start_date: string
  end_date: string
}): Promise<{ error: string | null }> {
  try {
    await submitLeaveRequestApi(fields)
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Submit failed' }
  }
}

export async function updateLeaveStatus(
  leaveId: string,
  status: 'approved' | 'rejected'
): Promise<{ error: string | null }> {
  try {
    await updateLeaveStatusApi(leaveId, status)
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Update failed' }
  }
}
