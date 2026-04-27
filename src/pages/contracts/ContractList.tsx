// Placeholder — extend with the same pattern as EmployeeList / LeaveList once
// you've confirmed the column names for contracts and documents tables.
// Run this in Supabase SQL editor to see what columns you have:
//   SELECT column_name, data_type FROM information_schema.columns
//   WHERE table_schema = 'public' AND table_name = 'contracts'
//   ORDER BY ordinal_position;

export function ContractsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Contracts</h1>
      <p className="text-sm text-gray-500 mb-6">
        This page follows the same pattern as the employee list. Add your query here once you've confirmed the contracts table columns.
      </p>
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-400">
          Extend <code className="bg-gray-100 px-1 rounded">src/pages/contracts/ContractList.tsx</code>
          {' '}using the pattern in <code className="bg-gray-100 px-1 rounded">useEmployees.ts</code>
        </p>
      </div>
    </div>
  )
}
