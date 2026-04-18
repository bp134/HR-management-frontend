# Employee Management MVP Pilot Tester Guide

## Purpose

This guide gives internal testers a consistent way to exercise the **admin**, **manager**, and **employee** journeys in the Employee Management MVP. The application uses Manus OAuth for authentication, and the current non-production test baseline also supports route-level impersonation for role checks. Testers therefore do **not** need separate passwords for the seeded manager and employee personas during this pilot.

## Access model

| Persona view | How to open it during the pilot | Expected scope |
| --- | --- | --- |
| Admin | Sign in normally and use the default protected routes with `?impersonate=off` or no impersonation parameter | Full operational access, including employee administration, CSV tools, compliance, audit, and role administration |
| Manager | Open protected routes with `?impersonate=manager` | Dashboard, Employees, and Leave only; direct-report employee scope only |
| Employee | Open protected routes with `?impersonate=employee` | Dashboard, Employees, and Leave only; self-service scope only |

The current baseline has already been browser-validated against the manager and employee impersonation paths, and direct access to restricted routes remains blocked for those roles in the protected UI.

## Seeded pilot personas

| Persona | Role view | Seeded employee record | Reference details to confirm in the UI |
| --- | --- | --- | --- |
| Current signed-in owner session | Admin | Not tied to a dedicated employee card for the pilot checklist | Sidebar should include **Access**, **Audit**, **Compliance**, **Add employee**, and CSV administration controls |
| Marcus Shaw | Manager | `EMP-1002` | Operations Manager, email `marcus.shaw@northstar.test`, should see a two-person team scope |
| Hannah Lee | Employee | `EMP-1003` | Service Coordinator, email `hannah.lee@northstar.test`, should see only her own employee scope |
| Alice Morgan | Manager reference used in seeded data and CSV mapping | `EMP-1001` | Head of People, email `alice.morgan@northstar.test`, valid manager target for human-friendly CSV imports |

## Recommended validation order

| Step | Route | What to confirm |
| --- | --- | --- |
| 1 | `/` | The dashboard title and visible navigation match the active role |
| 2 | `/employees` | Search, filters, row visibility, and record actions match the active scope |
| 3 | `/leave` | Employees can submit requests; managers and admins can approve pending requests |
| 4 | `/compliance` | Admin and HR views show the action queue, workflow buttons, and reminder activity |
| 5 | `/access` | Admin-only route remains restricted for manager and employee impersonation |

## Role-specific checks

### Admin journey

Open `/employees?impersonate=off` and confirm that the bulk CSV section is visible. The page should show **Export CSV**, **Load CSV template**, **Choose CSV file**, and **Import CSV**, along with the persistent import summary and recent bulk activity panel after actions are run.

Open `/compliance?impersonate=off` and confirm that workflow buttons are available for the action queue. Record at least one state transition such as **Reviewed**, **Renewal in progress**, **Replacement requested**, or **Resolve**, and verify that reminder activity remains visible in the workspace.

Open `/access?impersonate=off` and confirm that role administration is available only in the admin view.

### Manager journey

Open `/?impersonate=manager` and confirm that the sidebar is limited to **Dashboard**, **Employees**, and **Leave**. The dashboard headcount should reflect the manager’s permitted team scope rather than the full organisation.

Open `/employees?impersonate=manager` and confirm that only direct-report records are visible. Restricted operational areas such as **Access**, **Audit**, **Compliance**, **Documents**, and **Departments** should not be available in the sidebar.

Open `/leave?impersonate=manager` and confirm that pending requests can be approved when they fall within the visible team scope.

### Employee journey

Open `/?impersonate=employee` and confirm that the sidebar remains limited to **Dashboard**, **Employees**, and **Leave**. The dashboard headcount should drop to the self-service scope.

Open `/employees?impersonate=employee` and confirm that only the seeded employee record is visible. The employee should not be able to access privileged administration areas.

Open `/leave?impersonate=employee` and confirm that a leave request can be submitted, but approval controls are not shown.

## Human-friendly CSV import guidance

The employee bulk import flow now accepts human-friendly mappings for departments and managers. Testers can therefore prepare imports with `departmentName` and `managerEmail` instead of raw internal IDs.

| Preferred columns for pilot imports | Example value |
| --- | --- |
| `departmentName` | `People Operations` |
| `managerEmail` | `alice.morgan@northstar.test` |
| `departmentId` | Leave blank when using department name mapping |
| `managerId` | Leave blank when using manager email mapping |

A live browser validation has already confirmed that a CSV row using `departmentName=People Operations` and `managerEmail=alice.morgan@northstar.test` imports successfully without raw department or manager IDs when the remaining required fields are valid.

## Evidence files in the project

| File | Purpose |
| --- | --- |
| `validation-notes.md` | Prior browser verification notes for impersonation, CSV behavior, and runtime diagnostics |
| `notes/human-friendly-csv-browser-validation.md` | Live notes for the human-friendly CSV mapping validation, including the successful import result |
| `tmp-human-friendly-import.csv` | Earlier browser test sample for the human-friendly CSV flow |
| `tmp-human-friendly-import-valid.csv` | Fully valid sample that succeeded in the live import flow |

## Expected pilot outcomes

A successful pilot pass should show that role-based navigation is scoped correctly, employee visibility follows the active role, leave submission and approval behave according to permissions, compliance actions remain auditable, and the bulk CSV workflow supports both success and row-level error review without requiring raw department or manager IDs.
