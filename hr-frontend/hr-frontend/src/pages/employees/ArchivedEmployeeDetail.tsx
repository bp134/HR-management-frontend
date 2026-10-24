import { useMemo, useState } from 'react'
import { Link, useArchivedArchiveId } from '../../lib/router'
import { useArchivedEmployee } from '../../hooks/useArchivedEmployees'
import { getArchivedFileDownloadUrl, type ArchivedRecord } from '../../lib/api'
import { formatEmploymentType } from '../../types/database'

const RECORD_TYPE_LABELS: Record<string, string> = {
  contract: 'Contracts',
  document: 'Documents',
  leave_request: 'Leave requests',
  leave_balance: 'Leave balances',
  attendance: 'Attendance',
  performance_review: 'Performance reviews',
  disciplinary_record: 'Disciplinary records',
  managed_employee: 'Direct reports (manager reference)',
  leave_approval: 'Leave approved by this employee',
  review_conducted: 'Reviews conducted by this employee',
}

const RECORD_TYPE_ORDER = [
  'contract',
  'document',
  'disciplinary_record',
  'performance_review',
  'leave_request',
  'leave_balance',
  'attendance',
  'managed_employee',
  'leave_approval',
  'review_conducted',
]

const HIDDEN_PAYLOAD_KEYS = new Set(['employee_id', 'file_path'])

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value)
  }
  return String(value)
}

function humanKey(key: string): string {
  const label = key.replace(/_/g, ' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function displayName(row: { first_name: string | null; last_name: string | null; email: string | null }): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || 'Unnamed employee'
}

function initials(row: { first_name: string | null; last_name: string | null }): string {
  return ((row.first_name?.[0] ?? '') + (row.last_name?.[0] ?? '')).toUpperCase() || '?'
}

function isDownloadable(record: ArchivedRecord): boolean {
  if (record.record_type !== 'contract' && record.record_type !== 'document') return false
  if (!record.record_id) return false
  const filePath = record.payload?.file_path
  return typeof filePath === 'string' && filePath.length > 0
}

function recordTitle(record: ArchivedRecord): string {
  const payload = record.payload ?? {}

  if (record.record_type === 'document') {
    const type = payload.document_type
    const name = payload.file_name
    if (typeof type === 'string' && type) return type
    if (typeof name === 'string' && name) return name
  }

  if (record.record_type === 'contract') {
    const type = payload.contract_type
    if (typeof type === 'string' && type) return type
    const name = payload.file_name
    if (typeof name === 'string' && name) return name
  }

  if (record.record_type === 'leave_request') {
    const type = payload.leave_type
    const start = formatDate(typeof payload.start_date === 'string' ? payload.start_date : null)
    const end = formatDate(typeof payload.end_date === 'string' ? payload.end_date : null)
    if (type || start !== '—') return `${humanKey(String(type ?? 'Leave'))} · ${start} → ${end}`
  }

  if (record.record_type === 'attendance') {
    const clockIn = typeof payload.clock_in === 'string' ? payload.clock_in : null
    return clockIn ? `Shift · ${formatDateTime(clockIn)}` : 'Attendance record'
  }

  if (record.record_type === 'performance_review') {
    const date = typeof payload.review_date === 'string' ? payload.review_date : null
    const rating = payload.rating
    return [date ? formatDate(date) : null, rating !== undefined && rating !== null ? `Rating ${rating}` : null]
      .filter(Boolean)
      .join(' · ') || 'Performance review'
  }

  if (record.record_type === 'disciplinary_record') {
    const date = typeof payload.incident_date === 'string' ? payload.incident_date : null
    const type = payload.record_type ?? payload.type
    return [date ? formatDate(date) : null, typeof type === 'string' ? humanKey(type) : null]
      .filter(Boolean)
      .join(' · ') || 'Disciplinary record'
  }

  return RECORD_TYPE_LABELS[record.record_type] ?? humanKey(record.record_type)
}

function MetaItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className={`mt-0.5 text-sm text-gray-900 ${mono ? 'break-all font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}

export function ArchivedEmployeeDetailPage() {
  const archiveId = useArchivedArchiveId()
  const { employee, records, loading, error } = useArchivedEmployee(archiveId)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, ArchivedRecord[]>()
    for (const record of records) {
      const list = map.get(record.record_type)
      if (list) list.push(record)
      else map.set(record.record_type, [record])
    }

    const keys = [...map.keys()].sort((a, b) => {
      const aIndex = RECORD_TYPE_ORDER.indexOf(a)
      const bIndex = RECORD_TYPE_ORDER.indexOf(b)
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.localeCompare(b)
    })

    return keys.map(key => ({ type: key, records: map.get(key) ?? [] }))
  }, [records])

  async function handleDownload(record: ArchivedRecord) {
    if (!archiveId || !record.record_id) return

    setDownloading(record.record_id)
    setDownloadError(null)

    try {
      const { url } = await getArchivedFileDownloadUrl(archiveId, record.record_id)
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.click()
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not generate a download link')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="mx-auto max-w-5xl">
        <Link to="/employees/archived" className="text-sm text-indigo-600 hover:underline">
          ← Back to archived employees
        </Link>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error ?? 'Archived employee not found.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/employees/archived" className="text-sm text-indigo-600 hover:underline">
        ← Back to archived employees
      </Link>

      <div className="mt-4 mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-600">
            {initials(employee)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{displayName(employee)}</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {[employee.job_title, formatEmploymentType(employee.employment_type)]
                .filter(Boolean)
                .join(' · ') || 'Archived employee'}
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          Archived record
        </span>
      </div>

      <section className="mb-6 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700">Archive details</h2>
        </div>
        <dl className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetaItem label="Archive reference" value={employee.archive_id} mono />
          <MetaItem label="Archived at" value={formatDateTime(employee.archived_at)} />
          <MetaItem
            label="Archived by"
            value={employee.archived_by_email ?? 'Unknown'}
          />
          <MetaItem label="Reason" value={employee.reason ?? '—'} />
          <MetaItem label="Role held" value={humanKey(employee.role)} />
          <MetaItem label="Original employee ID" value={employee.employee_id} mono />
        </dl>
      </section>

      <section className="mb-6 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700">Personal details</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Values captured when the employee record was archived.
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetaItem label="Email" value={employee.email ?? '—'} />
          <MetaItem label="Phone" value={employee.phone ?? '—'} />
          <MetaItem label="Date of birth" value={formatDate(employee.date_of_birth)} />
          <MetaItem label="Job title" value={employee.job_title ?? '—'} />
          <MetaItem label="Employment type" value={formatEmploymentType(employee.employment_type)} />
          <MetaItem label="Employment start" value={formatDate(employee.start_date)} />
          <MetaItem label="Employment end" value={formatDate(employee.end_date)} />
          <MetaItem label="Emergency contact" value={employee.emergency_contact_name ?? '—'} />
          <MetaItem label="Emergency phone" value={employee.emergency_contact_phone ?? '—'} />
          <MetaItem label="Department ID" value={employee.department_id ?? '—'} mono />
          <MetaItem label="Former manager ID" value={employee.manager_id ?? '—'} mono />
          <MetaItem label="Record created" value={formatDateTime(employee.created_at)} />
        </dl>
        {employee.address && (
          <div className="border-t border-gray-100 px-5 py-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">Address</dt>
            <dd className="mt-0.5 whitespace-pre-line text-sm text-gray-900">{employee.address}</dd>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-1 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Retained records</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {records.length} record{records.length !== 1 ? 's' : ''} across {groups.length} categor
              {groups.length === 1 ? 'y' : 'ies'}. Contract and document files can be downloaded.
            </p>
          </div>
        </div>

        {downloadError && (
          <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{downloadError}</p>
          </div>
        )}

        {groups.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            No related records were retained for this employee.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {groups.map(group => (
              <div key={group.type} className="px-5 py-4">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {RECORD_TYPE_LABELS[group.type] ?? humanKey(group.type)}
                  </h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {group.records.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {group.records.map((record, index) => {
                    const entries = Object.entries(record.payload ?? {}).filter(
                      ([key]) => !HIDDEN_PAYLOAD_KEYS.has(key)
                    )
                    const downloadable = isDownloadable(record)
                    const isBusy = downloading !== null && downloading === record.record_id

                    return (
                      <div
                        key={`${record.record_type}-${record.record_id ?? index}`}
                        className="rounded-lg border border-gray-200 bg-gray-50/60 p-4"
                      >
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {recordTitle(record)}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              Archived {formatDateTime(record.archived_at)}
                              {record.record_id ? ` · Record ${record.record_id.slice(0, 8)}…` : ''}
                            </p>
                          </div>
                          {downloadable && (
                            <button
                              type="button"
                              onClick={() => handleDownload(record)}
                              disabled={isBusy}
                              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-50"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              {isBusy ? 'Preparing…' : 'Download file'}
                            </button>
                          )}
                        </div>

                        {entries.length > 0 && (
                          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 border-t border-gray-200/70 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                            {entries.map(([key, value]) => (
                              <div key={key}>
                                <dt className="text-xs text-gray-400">{humanKey(key)}</dt>
                                <dd className="break-words text-sm text-gray-800">{formatValue(value)}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
