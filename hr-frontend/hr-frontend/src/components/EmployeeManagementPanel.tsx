import { useState } from 'react'
import { useEmployees } from '../hooks/useEmployees'
import { Link } from '../lib/router'
import type { Employee } from '../types/database'
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog'
import { EmployeeFormModal, type EmployeeFormMode } from './EmployeeFormModal'

interface Props {
  currentEmployeeId: string
  isAdmin: boolean
  onChanged: () => void
}

interface FormState {
  mode: EmployeeFormMode
  employee: Employee | null
}

function displayName(employee: Employee): string {
  return [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email || 'Unnamed employee'
}

function initials(employee: Employee): string {
  return ((employee.first_name?.[0] ?? '') + (employee.last_name?.[0] ?? '')).toUpperCase() || '?'
}

export function EmployeeManagementPanel({ currentEmployeeId, isAdmin, onChanged }: Props) {
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { employees, loading, error, refresh } = useEmployees(search)

  function handleSaved() {
    refresh()
    onChanged()
    setNotice('Employee record saved.')
  }

  function handleDeleted(archiveId: string) {
    refresh()
    onChanged()
    setNotice(`Employee deleted and archived. Archive reference: ${archiveId}`)
  }

  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Employee management</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Add, amend or delete employees. Deleting revokes access and archives all records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ mode: 'create', employee: null })}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add employee
        </button>
      </div>

      <div className="px-5 py-4">
        {notice && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="break-all text-sm text-green-800">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs font-medium text-green-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="relative mb-4">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search employees to amend or delete…"
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : employees.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              {search ? 'No employees match your search.' : 'No employee records found.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Employee</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">Role</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(employee => {
                  const isSelf = employee.employee_id === currentEmployeeId
                  const isProtectedAdmin = employee.role === 'admin' && !isAdmin
                  return (
                    <tr key={employee.employee_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                            {initials(employee)}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/employees/${employee.employee_id}`}
                              className="block truncate font-medium text-gray-900 hover:text-indigo-600"
                            >
                              {displayName(employee)}
                            </Link>
                            <p className="truncate text-xs text-gray-400">{employee.email ?? 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                          {employee.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setForm({ mode: 'edit', employee })}
                            className="text-xs font-medium text-indigo-600 hover:underline"
                          >
                            Amend
                          </button>
                          {isSelf ? (
                            <span className="text-xs text-gray-400">You</span>
                          ) : isProtectedAdmin ? (
                            <span
                              className="text-xs text-gray-400"
                              title="Only an admin can delete an admin"
                            >
                              Admin
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(employee)}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {form && (
        <EmployeeFormModal
          mode={form.mode}
          employee={form.employee}
          isAdmin={isAdmin}
          lockRole={form.mode === 'edit' && form.employee?.employee_id === currentEmployeeId}
          onClose={() => setForm(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteEmployeeDialog
          employee={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </section>
  )
}
