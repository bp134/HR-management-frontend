export function DocumentsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Documents</h1>
      <p className="text-sm text-gray-500 mb-6">
        Run a column query on the documents table to confirm structure, then extend this page.
      </p>
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-400">
          Extend <code className="bg-gray-100 px-1 rounded">src/pages/documents/DocumentList.tsx</code>
          {' '}using the pattern in <code className="bg-gray-100 px-1 rounded">useEmployees.ts</code>
        </p>
      </div>
    </div>
  )
}
