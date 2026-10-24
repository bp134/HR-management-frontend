import { useEffect, useState } from 'react'
import { deleteEmployee } from '../hooks/useEmployees'
import type { Employee } from '../types/database'

interface Props {
  employee: Employee
  onClose: () => void
  onDeleted: (archiveId: string) => void
}

const CONFIRM_WORD = 'DELETE'

export function DeleteEmployeeDialog({ employee, onClose, onDeleted }: Props) {
  const [confirmation, setConfirmation] = useState('')
  const [reason, setReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const name = [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email || 'this employee'
  const canDelete = confirmation === CONFIRM_WORD && !deleting

  useEffect(() => {
    setConfirmation('')
    setReason('')
    setError(null)
  }, [employee.employee_id])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [deleting, onClose])

  async function handleDelete() {
    if (!canDelete) return

    setDeleting(true)
    setError(null)
    const result = await deleteEmployee(employee.employee_id, reason)
    setDeleting(false)

    if (result.error || !result.archiveId) {
      setError(result.error ?? 'The employee could not be archived.')
      return
    }

    onDeleted(result.archiveId)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !deleting) onClose()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-employee-title"
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 id="delete-employee-title" className="text-lg font-semibold text-gray-900">
            Delete {name}?
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Their access is revoked immediately and they disappear from the active directory.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">Records are archived, not erased.</p>
            <p className="mt-1 text-amber-700">
              The employee record and all related contracts, documents, leave, attendance,
              performance and disciplinary records are moved to the archive tables for
              GDPR/legal retention. Uploaded files stay in Azure Blob Storage. This action
              cannot be undone from the app.
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              Reason (optional, stored with the archive)
            </span>
            <textarea
              rows={2}
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="e.g. Employment ended 24/10/2026"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">
              Type <span className="font-mono font-semibold text-gray-800">{CONFIRM_WORD}</span> to confirm
            </span>
            <input
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? 'Archiving…' : 'Delete & archive'}
          </button>
        </div>
      </div>
    </div>
  )
}
