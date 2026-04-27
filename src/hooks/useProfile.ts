import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Employee } from '../types/database'

export interface Profile extends Employee {
  // Convenience: is the current user in one of these roles?
  isAdmin: boolean
  isHR: boolean
  isManager: boolean
}

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  // 'no_employee' means the auth email doesn't exist in employees table
  accessStatus: 'ok' | 'no_employee' | 'error' | null
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessStatus, setAccessStatus] = useState<UseProfileReturn['accessStatus']>(null)

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        if (!cancelled) { setProfile(null); setLoading(false) }
        return
      }

      // Call the SECURITY DEFINER function to link auth <-> employee on first login
      const { data: linkResult } = await supabase.rpc('link_employee_to_auth')

     if (linkResult?.status === 'no_employee') {
  if (!cancelled) {
    setAccessStatus('no_employee')
    setProfile(null)
    setLoading(false)
  }
  return
}
// 'created' status is fine — employee record was just auto-created, continue

      // Fetch the employee row (now user_id is set, RLS will allow this)
      const { data: emp, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (cancelled) return

      if (error || !emp) {
        setAccessStatus('error')
        setProfile(null)
      } else {
        setAccessStatus('ok')
        setProfile({
          ...emp,
          isAdmin: emp.role === 'admin',
          isHR: emp.role === 'hr' || emp.role === 'admin',
          isManager: emp.role === 'manager' || emp.role === 'admin' || emp.role === 'hr',
        })
      }
      setLoading(false)
    }

    loadProfile()

    // Re-run when auth state changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) loadProfile()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { profile, loading, accessStatus }
}
