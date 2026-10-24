import { useCallback, useEffect, useState } from 'react'
import {
  type Contract,
  getContracts,
  getContractDownloadUrl,
  uploadContractApi,
  deleteContractApi,
  ApiError,
} from '../lib/api'

export type { Contract }

export function useContracts(employeeId?: string) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getContracts(employeeId)
      .then(data => {
        if (!cancelled) {
          setContracts(data.contracts)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load contracts')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [employeeId, tick])

  return { contracts, loading, error, refresh }
}

export async function uploadContract(
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
): Promise<{ error: string | null }> {
  try {
    await uploadContractApi(employeeId, file, meta)
    return { error: null }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Upload failed' }
  }
}

export async function getContractUrl(contractId: string): Promise<string | null> {
  try {
    const data = await getContractDownloadUrl(contractId)
    return data.url
  } catch {
    return null
  }
}

export async function deleteContract(contractId: string): Promise<{ error: string | null }> {
  try {
    await deleteContractApi(contractId)
    return { error: null }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Delete failed' }
  }
}