import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { createEmployee, useEmployee, updateEmployee } from '../../hooks/useEmployees'
import { useProfile } from '../../hooks/useProfile'
import { EMPLOYMENT_TYPE_OPTIONS, formatEmploymentType, type Employee, type EmploymentType } from '../../types/database'

type EditableFields = Partial<
  Pick<Employee,
    'first_name' | 'last_name' | 'email' | 'phone' | 'address' |
    'emergency_contact_name' | 'emergency_contact_phone' |
    'job_title' | 'employment_type' | 'start_date' | 'end_date'
  >
>

const emptyForm = (): EditableFields => ({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  job_title: '',
  employment_type: undefined,
  start_date: '',
  end_date: '',
})

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isCreate = id === 'new'
  const { employee, loading, error } = useEmployee(id)
  const { profile } = useProfile()
  const navigate = useNavigate()

  const [editing, setEditing] = useState(isCreate)
  const [form, setForm] = useState<EditableFields>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (isCreate) {
      setEditing(true)
      setForm(emptyForm())
      return
    }
    if (employee) {
      setForm({
        first_name: employee.first_name ?? '',
        last_name: employee.last_name ?? '',
        email: employee.email ?? '',
        phone: employee.phone ?? '',
        address: employee.address ?? '',
        emergency_contact_name: employee.emergency_contact_name ?? '',
        emergency_contact_phone: employee.emergency_contact_phone ?? '',
        job_title: employee.job_title ?? '',
        employment_type: employee.employment_type ?? undefined,
        start_date: employee.start_date ?? '',
        end_date: employee.end_date ?? '',
      })
    }
  }, [employee, isCreate])

  const canEdit = isCreate
    ? profile?.isHR
    : profile?.isHR || profile?.employee_id === employee?.employee_id

  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    if (isCreate) {
      const { employee: created, error: err } = await createEmployee(form)
      setSaving(false)
      if (err) {
        setSaveError(err)
      } else if (created) {
        navigate(`/employees/${created.employee_id}`)
      }
      return
    }

    if (!id) return
    const { error: err } = await updateEmployee(id, form)
    setSaving(false)
    if (err) {
      setSaveError(err)
    } else {
      setEditing(false)
    }
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  )

  const Input = ({ label, field, type = 'text' }: { label: string; field: keyof EditableFields; type?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={(form[field] as string) ?? ''}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  )

  if (isCreate && !profile?.isHR) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm text-red-700">Only HR or admin can add employees.</p>
          <Link to="/employees" className="text-sm text-indigo-600 hover:underline mt-3 block">
            ← Back to employees
          </Link>
        </div>
      </div>
    )
  }

  if (!isCreate && loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isCreate && (error || !employee)) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm text-red-700">{error ?? "Employee not found or you don't have access."}</p>
          <Link to="/employees" className="text-sm text-indigo-600 hover:underline mt-3 block">
            ← Back to employees
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link to="/employees" className="hover:text-gray-600">Employees</Link>
        <span>›</span>
        <span className="text-gray-700">
          {isCreate ? 'New employee' : `${employee!.first_name} ${employee!.last_name}`}
        </span>
      </div>

      {/* Header card */}
      {!isCreate && (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-semibold">
              {((employee!.first_name?.[0] ?? '') + (employee!.last_name?.[0] ?? '')).toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {employee!.first_name} {employee!.last_name}
              </h1>
              <p className="text-sm text-gray-500">{employee!.job_title ?? 'No title set'}</p>
              <div className="flex items-center gap-2 mt-1">
                {employee!.employment_type && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 font-medium capitalize">
                    {formatEmploymentType(employee!.employment_type)}
                  </span>
                )}
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 capitalize">
                  {employee!.role}
                </span>
              </div>
            </div>
          </div>

          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>
      )}

      {/* Details / Edit form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {isCreate && (
          <h1 className="text-xl font-semibold text-gray-900 mb-5">Add employee</h1>
        )}
        {editing ? (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-gray-700">
              {isCreate ? 'Employee details' : 'Edit employee details'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First name" field="first_name" />
              <Input label="Last name" field="last_name" />
              <Input label="Email" field="email" type="email" />
              <Input label="Phone" field="phone" />
              <Input label="Job title" field="job_title" />
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Employment type</label>
                <select
                  value={form.employment_type ?? ''}
                  onChange={e => setForm(f => ({
                    ...f,
                    employment_type: (e.target.value || undefined) as EmploymentType | undefined,
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Select —</option>
                  {EMPLOYMENT_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <Input label="Start date" field="start_date" type="date" />
              <Input label="End date" field="end_date" type="date" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
              <textarea
                value={(form.address as string) ?? ''}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Emergency contact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Name" field="emergency_contact_name" />
                <Input label="Phone" field="emergency_contact_phone" />
              </div>
            </div>

            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : isCreate ? 'Create employee' : 'Save changes'}
              </button>
              <button
                onClick={() => {
                  if (isCreate) {
                    navigate('/employees')
                  } else {
                    setEditing(false)
                    setSaveError(null)
                  }
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : employee ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email" value={employee.email} />
                <Field label="Phone" value={employee.phone} />
                <Field label="Address" value={employee.address} />
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Employment</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Start date" value={formatDate(employee.start_date)} />
                <Field label="End date" value={formatDate(employee.end_date)} />
                <Field label="Date of birth" value={formatDate(employee.date_of_birth)} />
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Emergency contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name" value={employee.emergency_contact_name} />
                <Field label="Phone" value={employee.emergency_contact_phone} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
