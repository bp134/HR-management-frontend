import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Employee, Role } from '../types/database'

export interface Profile extends Employee {
  isAdmin: boolean
  isHR: boolean
  isManager: boolean
}

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
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

      // Link auth user to employee record on first login
      const { data: linkResult } = await supabase.rpc('link_employee_to_auth')
      const link = linkResult as { status: string; message?: string } | null

      if (link?.status === 'no_employee') {
        if (!cancelled) {
          setAccessStatus('no_employee')
          setProfile(null)
          setLoading(false)
        }
        return
      }

      // Fetch the employee row
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
        const employee = emp as Employee
        setAccessStatus('ok')
        setProfile({
          ...employee,
          isAdmin: employee.role === 'admin',
          isHR: employee.role === 'hr' || employee.role === 'admin',
          isManager: employee.role === 'manager' || employee.role === 'admin' || employee.role === 'hr',
        })
      }
      setLoading(false)
    }

    loadProfile()

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
