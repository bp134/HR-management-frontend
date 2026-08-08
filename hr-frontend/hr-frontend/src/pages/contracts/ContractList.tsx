import { useState } from 'react'
import { useContracts, uploadContract, getContractUrl, deleteContract } from '../../hooks/useContracts'
import { useProfile } from '../../hooks/useProfile'

export function ContractsPage() {
  const { profile } = useProfile()
  const { contracts, loading, error, refresh } = useContracts(
    profile?.isHR ? undefined : profile?.employee_id
  )

  const [showForm, setShowForm] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    contract_type: '',
    salary: '',
    hourly_rate: '',
    contracted_hours: '',
    start_date: '',
    end_date: '',
  })
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB') : '—'

  const formatCurrency = (n: number | null) =>
    n ? `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—'

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !profile) return
    setUploading(true)
    setFormError(null)

    const employeeId = profile.isHR
      ? prompt('Enter the employee ID for this contract:') ?? profile.employee_id
      : profile.employee_id

    const { error: err } = await uploadContract(employeeId, file, {
      contract_type: form.contract_type || null,
      salary: form.salary ? parseFloat(form.salary) : null,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      contracted_hours: form.contracted_hours ? parseInt(form.contracted_hours) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    })

    setUploading(false)
    if (err) { setFormError(err) }
    else {
      setShowForm(false)
      setFile(null)
      setForm({ contract_type: '', salary: '', hourly_rate: '', contracted_hours: '', start_date: '', end_date: '' })
      refresh()
    }
  }

  async function handleView(filePath: string) {
    const url = await getContractUrl(filePath)
    if (url) window.open(url, '_blank')
  }

  async function handleDelete(contractId: string, filePath: string | null) {
    if (!confirm('Delete this contract? This cannot be undone.')) return
    await deleteContract(contractId, filePath)
    refresh()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${contracts.length} contract${contracts.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {profile?.isHR && (
          <button
            onClick={() => setShowForm(s => !s)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload contract
          </button>
        )}
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Upload new contract</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">PDF file</label>
              <input
                type="file"
                accept="application/pdf"
                required
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-sm file:bg-gray-50 hover:file:bg-gray-100"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Contract type</label>
                <input
                  type="text"
                  placeholder="e.g. Permanent"
                  value={form.contract_type}
                  onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Salary (£)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.salary}
                  onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hourly rate (£)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.hourly_rate}
                  onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Contracted hours</label>
                <input
                  type="number"
                  placeholder="e.g. 37"
                  value={form.contracted_hours}
                  onChange={e => setForm(f => ({ ...f, contracted_hours: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={uploading || !file}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"><p className="text-sm text-red-700">{error}</p></div>}

      {/* Contract list */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-400">No contracts found.</p>
          </div>
        ) : contracts.map(contract => (
          <div key={contract.contract_id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {contract.file_name ?? 'Contract'}
                  </p>
                  {contract.contract_type && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700">
                      {contract.contract_type}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-1">
                  {contract.salary && <span>Salary: {formatCurrency(contract.salary)}</span>}
                  {contract.hourly_rate && <span>Hourly: {formatCurrency(contract.hourly_rate)}</span>}
                  {contract.contracted_hours && <span>Hours: {contract.contracted_hours}pw</span>}
                  {contract.start_date && <span>From: {formatDate(contract.start_date)}</span>}
                  {contract.end_date && <span>To: {formatDate(contract.end_date)}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {contract.file_path && (
                  <button
                    onClick={() => handleView(contract.file_path!)}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    View PDF
                  </button>
                )}
                {profile?.isHR && (
                  <button
                    onClick={() => handleDelete(contract.contract_id, contract.file_path)}
                    className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}