import { Navigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'

interface Props {
  children: React.ReactNode
  requireRole?: ('admin' | 'hr' | 'manager' | 'employee')[]
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { profile, loading, accessStatus } = useProfile()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    // Not logged in at all
    if (accessStatus === null) return <Navigate to="/login" replace />

    // Logged in but email not in employees table
    if (accessStatus === 'no_employee') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Access not granted</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your email address is not registered as an employee in this system.
              Please contact HR to have your record set up.
            </p>
            <button
              onClick={() => supabase_signout()}
              className="text-sm text-indigo-600 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      )
    }

    return <Navigate to="/login" replace />
  }

  // Role check
  if (requireRole && !requireRole.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Insufficient permissions</h2>
          <p className="text-sm text-gray-500">
            You don't have access to this page. Contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Helper used in the no-employee screen above
async function supabase_signout() {
  const { supabase } = await import('../lib/supabase')
  await supabase.auth.signOut()
  window.location.href = '/login'
}
