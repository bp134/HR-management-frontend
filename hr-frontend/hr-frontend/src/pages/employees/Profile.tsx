import { useProfile } from '../../hooks/useProfile'
import { formatEmploymentType } from '../../types/database'

export function ProfilePage() {
  const { profile } = useProfile()

  if (!profile) return null

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">My profile</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-semibold">
            {((profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')).toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {profile.first_name} {profile.last_name}
            </h2>
            <p className="text-sm text-gray-500">{profile.job_title ?? 'No title set'}</p>
            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">
              {profile.role}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" value={profile.email} />
              <Field label="Phone" value={profile.phone} />
              <Field label="Address" value={profile.address} />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Employment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Employment type" value={formatEmploymentType(profile.employment_type)} />
              <Field label="Start date" value={formatDate(profile.start_date)} />
              {profile.end_date && <Field label="End date" value={formatDate(profile.end_date)} />}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Emergency contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" value={profile.emergency_contact_name} />
              <Field label="Phone" value={profile.emergency_contact_phone} />
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        To update your details, contact HR or your manager.
      </p>
    </div>
  )
}
