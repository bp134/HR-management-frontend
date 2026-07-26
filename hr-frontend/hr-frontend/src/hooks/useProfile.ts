import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { useCallback, useEffect, useState } from 'react'
import { useMsalReady } from '../auth/AuthProvider'
import { ApiError, getMe, type AccessStatus } from '../lib/api'
import type { Employee } from '../types/database'

export interface Profile extends Employee {
  isAdmin: boolean
  isHR: boolean
  isManager: boolean
}

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  accessStatus: AccessStatus | 'error' | null
  errorMessage: string | null
  refresh: () => void
}

export function useProfile(): UseProfileReturn {
  const msalReady = useMsalReady()
  const isAuthenticated = useIsAuthenticated()
  const { accounts } = useMsal()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessStatus, setAccessStatus] = useState<UseProfileReturn['accessStatus']>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false

    async function loadProfile(attempt = 0) {
      if (!msalReady || !isAuthenticated || accounts.length === 0) {
        if (!cancelled) {
          setProfile(null)
          setAccessStatus(null)
          setErrorMessage(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      setErrorMessage(null)
      try {
        const me = await getMe()
        if (cancelled) return

        setAccessStatus(me.accessStatus)
        setErrorMessage(null)

        if (me.accessStatus === 'ok' && me.employee && me.flags) {
          setProfile({
            ...me.employee,
            isAdmin: me.flags.isAdmin,
            isHR: me.flags.isHR,
            isManager: me.flags.isManager,
          })
        } else {
          setProfile(null)
        }
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401 && attempt < 1) {
          await new Promise(r => setTimeout(r, 500))
          if (!cancelled) return loadProfile(attempt + 1)
          return
        }
        const message = err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unknown error'
        if (import.meta.env.DEV) {
          console.error('getMe failed:', err)
        }
        setAccessStatus('error')
        setErrorMessage(message)
        setProfile(null)
      }
      if (!cancelled) setLoading(false)
    }

    loadProfile()
    return () => { cancelled = true }
  }, [msalReady, isAuthenticated, accounts, tick])

  return { profile, loading, accessStatus, errorMessage, refresh }
}
