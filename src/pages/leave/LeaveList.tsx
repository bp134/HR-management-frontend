import { useState } from 'react'
import { useLeaveRequests, submitLeaveRequest, updateLeaveStatus } from '../../hooks/useLeave'
import { useProfile } from '../../hooks/useProfile'
import type { LeaveStatus } from '../../types/database'

const STATUS_COLOURS: Record<LeaveStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}

export function LeaveListPage() {
  const { profile } = useProfile()
  const [filter, setFilter] = useState<LeaveStatus | undefined>(undefined)
  const { requests, loading, error, refresh } = useLeaveRequests(filter)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ start_date: '', end_date: '', leave_type: 'annual', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [actionError, setActionError] = useState<string | null>(null)

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  async function handleSubmitLeave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSubmitting(true)
    setFormError(null)

    const { error: err } = await submitLeaveRequest({
      employee_id: profile.employee_id,
      ...form,
    })

    setSubmitting(false)
    if (err) {
      setFormError(err)
    } else {
      setShowForm(false)
      setForm({ start_date: '', end_date: '', leave_type: 'annual', reason: '' })
      refresh()
    }
  }

  async function handleApprove(leaveId: string) {
    if (!profile) return
    setActionError(null)
    const { error: err } = await updateLeaveStatus(leaveId, 'approved', profile.employee_id)
    if (err) setActionError(err)
    else refresh()
  }

  async function handleReject(leaveId: string) {
    if (!profile) return
    setActionError(null)
    const { error: err } = await updateLeaveStatus(leaveId, 'rejected', profile.employee_id)
    if (err) setActionError(err)
    else refresh()
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leave requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {profile?.isManager ? "Your team's requests and your own" : 'Your leave history'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Request leave
        </button>
      </div>

      {/* New leave form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">New leave request</h2>
          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={form.leave_type}
                  onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="annual">Annual leave</option>
                  <option value="sick">Sick leave</option>
                  <option value="unpaid">Unpaid leave</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  required
                  min={form.start_date}
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reason (optional)</label>
              <textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                rows={2}
                placeholder="Briefly describe your reason…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {([undefined, 'pending', 'approved', 'rejected'] as const).map(status => (
          <button
            key={status ?? 'all'}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{actionError}</p>
        </div>
      )}

      {/* List */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-400">No leave requests found.</p>
          </div>
        ) : (
          requests.map(req => {
            const isOwnRequest = req.employee_id === profile?.employee_id
            const canApprove = profile?.isManager && !isOwnRequest && req.status === 'pending'

            return (
              <div key={req.leave_id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {/* Show employee name if viewing as manager/HR */}
                    {!isOwnRequest && (
                      <p className="text-sm font-medium text-gray-900 mb-0.5">
                        {req.employee_first_name} {req.employee_last_name}
                        <span className="text-gray-400 font-normal"> · {req.employee_email}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm text-gray-700 font-medium capitalize">
                        {req.leave_type?.replace('_', ' ') ?? 'Leave'}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_COLOURS[req.status]}`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(req.start_date as string | null)} → {formatDate(req.end_date as string | null)}
                    </p>
                    {req.reason && (
                      <p className="text-xs text-gray-500 mt-1 italic">"{req.reason as string}"</p>
                    )}
                  </div>

                  {/* Approve / Reject buttons */}
                  {canApprove && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(req.leave_id)}
                        className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(req.leave_id)}
                        className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
