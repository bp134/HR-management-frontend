import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { EmployeeListPage } from './pages/employees/EmployeeList'
import { EmployeeDetailPage } from './pages/employees/EmployeeDetail'
import { ProfilePage } from './pages/employees/Profile'
import { LeaveListPage } from './pages/leave/LeaveList'
import { ContractsPage } from './pages/contracts/ContractList'
import { DocumentsPage } from './pages/documents/DocumentList'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — all authenticated employees */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="leave" element={<LeaveListPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="documents" element={<DocumentsPage />} />

          {/* Managers and above only */}
          <Route
            path="employees"
            element={
              <ProtectedRoute requireRole={['admin', 'hr', 'manager']}>
                <EmployeeListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="employees/:id"
            element={
              <ProtectedRoute requireRole={['admin', 'hr', 'manager']}>
                <EmployeeDetailPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
