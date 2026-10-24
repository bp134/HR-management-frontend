import { useEffect, useState, type FormEvent } from 'react'
import { createEmployee, updateEmployee } from '../hooks/useEmployees'
import {
  EMPLOYMENT_TYPE_OPTIONS,
  type Employee,
  type EmploymentType,
  type Role,
} from '../types/database'

export type EmployeeFormMode = 'create' | 'edit'

interface FormState {
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  employment_type: EmploymentType | ''
  role: Role
  start_date: string
  end_date: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'admin', label: 'Admin' },
]

function formFromEmployee(employee: Employee | null): FormState {
  return {
    first_name: employee?.first_name ?? '',
    last_name: employee?.last_name ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    job_title: employee?.job_title ?? '',
    employment_type: employee?.employment_type ?? '',
    role: employee?.role ?? 'employee',
    start_date: employee?.start_date ?? '',
    end_date: employee?.end_date ?? '',
    address: employee?.address ?? '',
    emergency_contact_name: employee?.emergency_contact_name ?? '',
    emergency_contact_phone: employee?.emergency_contact_phone ?? '',
  }
}

interface Props {
  mode: EmployeeFormMode
  employee: Employee | null
  isAdmin: boolean
  lockRole?: boolean
  onClose: () => void
  onSaved: () => void
}

export function EmployeeFormModal({
  mode,
  employee,
  isAdmin,
  lockRole = false,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(() => formFromEmployee(employee))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const adminRoleLocked = !isAdmin && form.role === 'admin'
  const roleLocked = lockRole || adminRoleLocked

  useEffect(() => {
    setForm(formFromEmployee(employee))
    setError(null)
  }, [employee, mode])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const email = form.email.trim()
    if (!email || !email.includes('@')) {
      setError('A valid email address is required.')
      return
    }

    setSaving(true)
    setError(null)

    const baseFields = {
      first_name: form.first_name.trim() || null,
      last_name: form.last_name.trim() || null,
      email,
      phone: form.phone.trim() || null,
      job_title: form.job_title.trim() || null,
      employment_type: form.employment_type || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      address: form.address.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
    }

    const fields = roleLocked ? baseFields : { ...baseFields, role: form.role }

    const result = mode === 'create'
      ? await createEmployee(fields)
      : employee
        ? await updateEmployee(employee.employee_id, fields)
        : { error: 'No employee selected' }

    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    onSaved()
    onClose()
  }

  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-form-title"
        className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 id="employee-form-title" className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? 'Add employee' : 'Amend employee'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {mode === 'create'
                ? 'Create the employee record. Access is granted once their Microsoft account matches the email.'
                : 'Changes are saved immediately to the active employee directory.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">First name</span>
                <input
                  className={inputClass}
                  value={form.first_name}
                  onChange={event => set('first_name', event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">Last name</span>
                <input
                  className={inputClass}
                  value={form.last_name}
                  onChange={event => set('last_name', event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">Email</span>
                <input
                  type="email"
                  required
                  className={inputClass}
                  value={form.email}
                  onChange={event => set('email', event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">Phone</span>
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={event => set('phone', event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">Job title</span>
                <input
                  className={inputClass}
                  value={form.job_title}
                  onChange={event => set('job_title', event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">Employment type</span>
                <select
                  className={inputClass}
                  value={form.employment_type}
                  onChange={event => set('employment_type', event.target.value as EmploymentType | '')}
                >
                  <option value="">— Select —</option>
                  {EMPLOYMENT_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">System role</span>
                <select
                  className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-500`}
                  value={form.role}
                  disabled={roleLocked}
                  onChange={event => set('role', event.target.value as Role)}
                >
                  {ROLE_OPTIONS.map(option => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.value === 'admin' && !isAdmin}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                {lockRole && (
                  <span className="mt-1 block text-xs text-gray-400">
                    You cannot change your own role.
                  </span>
                )}
                {!lockRole && adminRoleLocked && (
                  <span className="mt-1 block text-xs text-gray-400">
                    Only an admin can change an admin's role.
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">Start date</span>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.start_date}
                    onChange={event => set('start_date', event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">End date</span>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.end_date}
                    onChange={event => set('end_date', event.target.value)}
                  />
                </label>
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">Address</span>
              <textarea
                rows={3}
                className={`${inputClass} resize-none`}
                value={form.address}
                onChange={event => set('address', event.target.value)}
              />
            </label>

            <div className="border-t pt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Emergency contact
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">Name</span>
                  <input
                    className={inputClass}
                    value={form.emergency_contact_name}
                    onChange={event => set('emergency_contact_name', event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">Phone</span>
                  <input
                    className={inputClass}
                    value={form.emergency_contact_phone}
                    onChange={event => set('emergency_contact_phone', event.target.value)}
                  />
                </label>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : mode === 'create' ? 'Create employee' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
