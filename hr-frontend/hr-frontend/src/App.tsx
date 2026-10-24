import type { ReactNode } from 'react'
import { Navigate, RouterProvider, usePathname } from './lib/router'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { EmployeeListPage } from './pages/employees/EmployeeList'
import { EmployeeDetailPage } from './pages/employees/EmployeeDetail'
import { ArchivedEmployeesPage } from './pages/employees/ArchivedEmployees'
import { ArchivedEmployeeDetailPage } from './pages/employees/ArchivedEmployeeDetail'
import { ProfilePage } from './pages/employees/Profile'
import { LeaveListPage } from './pages/leave/LeaveList'
import { ContractsPage } from './pages/contracts/ContractList'
import { DocumentsPage } from './pages/documents/DocumentList'

function AppRoutes() {
  const pathname = usePathname()

  if (pathname === '/login') {
    return <LoginPage />
  }

  let page: ReactNode
  if (pathname === '/') {
    page = <DashboardPage />
  } else if (pathname === '/profile') {
    page = <ProfilePage />
  } else if (pathname === '/leave') {
    page = <LeaveListPage />
  } else if (pathname === '/contracts') {
    page = <ContractsPage />
  } else if (pathname === '/documents') {
    page = <DocumentsPage />
  } else if (pathname === '/employees') {
    page = (
      <ProtectedRoute requireRole={['owner', 'admin', 'hr', 'manager']}>
        <EmployeeListPage />
      </ProtectedRoute>
    )
  } else if (pathname === '/employees/archived') {
    page = (
      <ProtectedRoute requireRole={['owner', 'admin', 'hr']}>
        <ArchivedEmployeesPage />
      </ProtectedRoute>
    )
  } else if (/^\/employees\/archived\/[^/]+$/.test(pathname)) {
    page = (
      <ProtectedRoute requireRole={['owner', 'admin', 'hr']}>
        <ArchivedEmployeeDetailPage />
      </ProtectedRoute>
    )
  } else if (/^\/employees\/[^/]+$/.test(pathname)) {
    page = (
      <ProtectedRoute requireRole={['owner', 'admin', 'hr', 'manager']}>
        <EmployeeDetailPage />
      </ProtectedRoute>
    )
  } else {
    return <Navigate to="/" replace />
  }

  return (
    <ProtectedRoute>
      <Layout>{page}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <RouterProvider>
      <AppRoutes />
    </RouterProvider>
  )
}
