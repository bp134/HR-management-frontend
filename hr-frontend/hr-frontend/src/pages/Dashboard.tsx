import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats } from '../lib/api'
import { useProfile } from '../hooks/useProfile'

interface Stats {
  totalEmployees: number
  pendingLeave: number
  activeContracts: number
}

export function DashboardPage() {
  const { profile } = useProfile()
  const [stats, setStats] = useState<Stats>({ totalEmployees: 0, pendingLeave: 0, activeContracts: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.isManager) {
      setLoading(false)
      return
    }

    getDashboardStats()
      .then(data => {
        setStats({
          totalEmployees: data.totalEmployees,
          pendingLeave: data.pendingLeave,
          activeContracts: data.activeContracts,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [profile?.isManager])

  if (!profile) return null

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const StatCard = ({
    label, value, sublabel, to, colour,
  }: { label: string; value: number | string; sublabel?: string; to: string; colour: string }) => (
    <Link to={to} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${colour} mb-3`}>
        <span className="text-lg font-bold text-white">{typeof value === 'number' ? value : '—'}</span>
      </div>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
    </Link>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {greeting()}, {profile.first_name}
        </h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">
          {profile.role} · {profile.job_title ?? 'HR System'}
        </p>
      </div>

      {profile.isManager && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Employees visible"
            value={stats.totalEmployees}
            sublabel="Based on your access level"
            to="/employees"
            colour="bg-indigo-500"
          />
          <StatCard
            label="Pending leave"
            value={stats.pendingLeave}
            sublabel="Awaiting approval"
            to="/leave"
            colour="bg-amber-500"
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/profile"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">My profile</p>
              <p className="text-xs text-gray-400">View your details</p>
            </div>
          </Link>

          <Link
            to="/leave"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Leave requests</p>
              <p className="text-xs text-gray-400">
                {profile.isManager ? 'View & approve requests' : 'Request time off'}
              </p>
            </div>
          </Link>

          {profile.isHR && (
            <Link
              to="/employees"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Employee directory</p>
                <p className="text-xs text-gray-400">Search and manage employees</p>
              </div>
            </Link>
          )}

          <Link
            to="/documents"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Documents</p>
              <p className="text-xs text-gray-400">Contracts, ID and certifications</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
