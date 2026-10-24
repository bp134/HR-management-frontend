import { useCallback, useEffect, useState } from 'react'
import {
  getArchivedEmployee,
  getArchivedEmployees,
  type ArchivedEmployee,
  type ArchivedRecord,
} from '../lib/api'

interface UseArchivedEmployeesReturn {
  archived: ArchivedEmployee[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useArchivedEmployees(): UseArchivedEmployeesReturn {
  const [archived, setArchived] = useState<ArchivedEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getArchivedEmployees()
      .then(({ archived: rows }) => {
        if (cancelled) return
        setArchived(rows)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load archived employees')
        setArchived([])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [tick])

  return { archived, loading, error, refresh }
}

interface UseArchivedEmployeeReturn {
  employee: ArchivedEmployee | null
  records: ArchivedRecord[]
  loading: boolean
  error: string | null
}

export function useArchivedEmployee(archiveId: string | undefined): UseArchivedEmployeeReturn {
  const [employee, setEmployee] = useState<ArchivedEmployee | null>(null)
  const [records, setRecords] = useState<ArchivedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!archiveId) {
      setEmployee(null)
      setRecords([])
      setError('No archive reference supplied.')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getArchivedEmployee(archiveId)
      .then(({ employee: row, records: recordRows }) => {
        if (cancelled) return
        setEmployee(row)
        setRecords(recordRows)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load archived employee')
        setEmployee(null)
        setRecords([])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [archiveId])

  return { employee, records, loading, error }
}
