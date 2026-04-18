# Browser Validation Notes

## Manager impersonation

Validated URL: `/?impersonate=manager`

Observed live UI behavior:
- Dashboard header changed to **Manager dashboard**.
- Sidebar exposed only **Dashboard**, **Employees**, and **Leave**.
- Admin-only areas such as **Add employee**, **Departments**, **Contracts**, **Documents**, **Compliance**, **Audit**, and **Role administration** were not visible in the sidebar.
- Headcount showed **2** visible employees, matching the expected manager scope.
- Team summary listed **Marcus Shaw** and **Hannah Lee**, consistent with seeded manager visibility.
- Compliance alert cards were visible on the dashboard summary, including expiring contract and ID document notices for Hannah Lee.

Validation outcome: manager UI scope appears aligned with the intended non-production impersonation and RLS-aware navigation rules.

## Employee impersonation

Validated URL: `/?impersonate=employee`

Observed live UI behavior:
- Dashboard header changed to **Employee dashboard**.
- Sidebar remained limited to **Dashboard**, **Employees**, and **Leave**, with no admin or HR management entries visible.
- Headcount dropped to **1**, showing only the seeded employee within the permitted scope.
- Team summary showed only **Hannah Lee**, consistent with employee self-access expectations.
- Compliance alerts on the dashboard summary were restricted to the seeded employee’s own expiring items.

Validation outcome: employee UI scope appears aligned with the intended self-service visibility rules and the impersonation path resolves to the correct seeded record.

## Direct route checks

Validated URL: `/access?impersonate=manager`

The seeded manager was shown a **Restricted area** screen instead of the role-administration surface. This confirmed that direct navigation to an admin-only route is still blocked even when the impersonation helper is active.

Validated URL: `/employees?impersonate=employee`

The seeded employee list rendered a single visible record for **Hannah Lee** and did not surface any additional employee rows. This provided an additional browser-level confirmation that the employee self-service experience is constrained to the employee’s own record in the UI.

Validated URL: `/documents?impersonate=employee`

The seeded employee was shown the same **Restricted area** response when attempting to open the privileged document-management route directly. This completed the browser-level verification that employee impersonation preserves route-guard denial for HR-only screens while still allowing self-service pages.

## CSV bulk administration

Validated URL: `/employees?impersonate=off`

Observed live UI behavior:
- The employee records page rendered a dedicated **Bulk CSV administration** section for the admin view.
- The section exposed **Export CSV**, **Load CSV template**, **Choose CSV file**, and **Import CSV** controls.
- The textarea showed the shared CSV header contract used by the new server-side import and export procedures.
- The employee table and row actions still rendered correctly beneath the new bulk tooling.

Validation outcome: the bulk CSV interface is present in the authorized employee-management view and integrates without disrupting the existing employee list experience.

## CSV hardening follow-up

Validated URL: `/employees?impersonate=off`

Observed live UI behavior after the validation and summary hardening pass:
- The employee records page continued to render the **Bulk CSV administration** section for the admin view without layout regressions.
- The page still exposed the **Export CSV**, **Load CSV template**, **Choose CSV file**, and **Import CSV** controls after the latest client update.
- The filtered employee list and action buttons remained visible beneath the bulk tooling, indicating the employee workspace stayed stable after the CSV feature changes.

Validation outcome: the hardened CSV bulk administration interface still renders correctly in the live admin employee-management view.

## Runtime baseline verification

Validated evidence:
- `.manus-logs/devserver.log` shows the previously reported `./env` failure at `2026-04-15T23:13:57.858Z`, caused by an earlier `server/_core/context.ts` line written as `import { env } from "./env";`.
- The current `server/_core/context.ts` source now uses `import { ENV } from "./env";`, which matches the exported symbol from `server/_core/env.ts`.
- Fresh protected-route loads on `/employees?impersonate=off` added only new debug/info lines in `.manus-logs/browserConsole.log`, with no fresh runtime syntax errors.
- `pnpm test -- --run` completed successfully with 7 passing test files and 26 passing tests.

Validation outcome: the reported runtime/import mismatch is attributable to an earlier transient server restart state, and the current application baseline is behaving cleanly enough to continue pilot-readiness work.

## CSV audit history and downloadable error reporting validation

Validated URL: `/employees?impersonate=off`

Observed live UI behavior:
- A live **Export CSV** action completed successfully and showed a confirmation toast for **55** exported rows with an audit reference.
- The **Recent bulk CSV activity** panel updated immediately to show a new **CSV export** audit entry with the recorded row count.
- A live **Import CSV** submission produced a persistent **Last import summary** card instead of relying only on transient feedback.
- The summary displayed an audit reference and exposed both **Download error report** and **Download row errors** controls.
- The inline row-level validation list rendered the current failures directly in the page, including a duplicate NI number and an unknown manager identifier.
- The **Recent bulk CSV activity** panel updated again to show the new **CSV import** audit event with imported-row and error-count details.

Validation outcome: the new bulk-action audit history and downloadable row-error workflow are functioning in the live employee-management interface.

## CSV mixed import follow-up

Validated URL: `/employees?impersonate=off`

Observed live UI behavior:
- A live mixed CSV submission created **1** employee record and flagged **1** row for review in a persistent **Last import summary**.
- The summary listed imported employee number `EMP-LIVE-391243` and displayed audit reference `1776304398451`.
- The page exposed both **Download error report** and **Download row errors** actions after the submission completed.
- Inline validation showed the invalid row as `Row 3 · EMP-LIVE-BAD-391243: managerId 999999 does not match an existing employee.`
- The **Recent bulk CSV activity** panel updated with a fresh import event, `CSV import · audit #120035`, showing that the live submission was recorded in the audit trail.

Validation outcome: the current browser run confirms the mixed-path CSV workflow handles a successful row and an invalid row together, preserves a persistent summary, and records the action in recent bulk activity.
