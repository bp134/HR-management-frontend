import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { signOut } from '../auth/AuthProvider'
import { useProfile } from '../hooks/useProfile'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  roles?: string[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  },
  {
    label: 'Employees',
    to: '/employees',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    roles: ['admin', 'hr', 'manager'],
  },
  {
    label: 'My Profile',
    to: '/profile',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  },
  {
    label: 'Leave Requests',
    to: '/leave',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  },
  {
    label: 'Contracts',
    to: '/contracts',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
  {
    label: 'Documents',
    to: '/documents',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
  },
  {
    label: 'Admin',
    to: '/admin',
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
    roles: ['admin'],
  },
]

export function Layout() {
  const { profile } = useProfile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleNav = navItems.filter(
    item => !item.roles || (profile && item.roles.includes(profile.role))
  )

  async function handleSignOut() {
    await signOut()
  }

  const NavIcon = ({ d }: { d: React.ReactNode }) => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {d}
    </svg>
  )

  const Sidebar = ({ mobile = false }) => (
    <nav className={mobile
      ? "fixed inset-0 z-40 flex"
      : "hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0"
    }>
      {mobile && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`relative flex flex-col flex-1 bg-indigo-900 ${mobile ? 'w-64' : 'w-full'}`}>
        <div className="flex items-center h-16 px-6 border-b border-indigo-800">
          <div className="w-7 h-7 bg-indigo-400 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">HR System</span>
        </div>

        {profile && (
          <div className="px-4 py-4 border-b border-indigo-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {(profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {profile.first_name} {profile.last_name}
                </p>
                <p className="text-indigo-300 text-xs capitalize">{profile.role}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-700 text-white'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`
              }
            >
              <NavIcon d={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="px-3 pb-4 border-t border-indigo-800 pt-3">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-indigo-200 hover:bg-indigo-800 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && <Sidebar mobile />}

      <Sidebar />

      <div className="md:pl-64">
        <div className="md:hidden flex items-center h-16 px-4 bg-indigo-900 border-b border-indigo-800">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-indigo-200 hover:text-white mr-4"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-semibold text-sm">HR System</span>
        </div>

        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
