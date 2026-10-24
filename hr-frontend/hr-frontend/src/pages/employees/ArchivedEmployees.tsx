import { useMemo, useState } from 'react'
import { Link } from '../../lib/router'
import { useArchivedEmployees } from '../../hooks/useArchivedEmployees'

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

function displayName(row: { first_name: string | null; last_name: string | null; email: string | null }): string {
  return [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || 'Unnamed employee'
}

function initials(row: { first_name: string | null; last_name: string | null }): string {
  return ((row.first_name?.[0] ?? '') + (row.last_name?.[0] ?? '')).toUpperCase() || '?'
}

export function ArchivedEmployeesPage() {
  const [search, setSearch] = useState('')
  const { archived, loading, error } = useArchivedEmployees()

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return archived

    return archived.filter(row => {
      const haystack = [
        row.first_name,
        row.last_name,
        row.email,
        row.job_title,
        row.employment_type,
        row.reason,
        row.archived_by_email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [archived, search])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Archived employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading
              ? 'Loading…'
              : `${archived.length} archived record${archived.length !== 1 ? 's' : ''} retained for GDPR and legal purposes`}
          </p>
        </div>
        <Link
          to="/employees"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Active employees
        </Link>
      </div>

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-800">
          These records are read-only. Deleting an employee revokes their access but keeps their
          employee details, contracts, documents and related records here for legal retention.
        </p>
      </div>

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
          placeholder="Search archived employees by name, email, job title or reason…"
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">
            {archived.length === 0
              ? 'No archived employees yet. Deleted employees will appear here.'
              : 'No archived employees match your search.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Employee</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">Role</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">Archived</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(row => (
                <tr key={row.archive_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                        {initials(row)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/employees/archived/${row.archive_id}`}
                          className="block truncate font-medium text-gray-900 hover:text-indigo-600"
                        >
                          {displayName(row)}
                        </Link>
                        <p className="truncate text-xs text-gray-400">{row.email ?? 'No email'}</p>
                        <p className="truncate text-xs text-gray-400 md:hidden">
                          Archived {formatDateTime(row.archived_at)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                      {row.role}
                    </span>
                    {row.job_title && <p className="mt-1 truncate text-xs text-gray-400">{row.job_title}</p>}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell">
                    <p className="text-gray-700">{formatDateTime(row.archived_at)}</p>
                    <p className="truncate text-xs text-gray-400">
                      {row.archived_by_email ?? 'Unknown'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/employees/archived/${row.archive_id}`}
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      View ({row.record_count ?? 0})
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          Showing {filtered.length} of {archived.length} archived record{archived.length !== 1 ? 's' : ''}.
        </p>
      )}
    </div>
  )
}
