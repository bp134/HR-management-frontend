# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pilot-rollout.spec.ts >> pilot rollout flows >> employee impersonation retains self-service scope on the leave workflow
- Location: e2e/pilot-rollout.spec.ts:42:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Leave workflow' })
Expected: visible
Error: strict mode violation: getByRole('heading', { name: 'Leave workflow' }) resolved to 3 elements:
    1) <h1 data-loc="client/src/components/DashboardLayout.tsx:71" class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Leave workflows</h1> aka locator('h1')
    2) <h2 data-loc="client/src/components/DashboardLayout.tsx:152" class="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Leave workflows</h2> aka locator('h2')
    3) <h3 data-loc="client/src/pages/HRPages.tsx:187" class="text-2xl font-semibold tracking-tight text-slate-950">Leave workflow</h3> aka getByRole('heading', { name: 'Leave workflow', exact: true })

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Leave workflow' })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e4]:
    - complementary [ref=e5]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]:
            - img [ref=e10]
            - text: Northstar HR
          - heading "Leave workflows" [level=1] [ref=e12]
          - paragraph [ref=e13]: Submit requests, review approvals, and monitor leave activity through scoped permissions.
        - img [ref=e15]
      - navigation [ref=e21]:
        - link "Dashboard" [ref=e22] [cursor=pointer]:
          - /url: /
          - generic [ref=e23]:
            - generic [ref=e24]:
              - img [ref=e26]
              - generic [ref=e31]: Dashboard
            - img [ref=e33]
        - link "Employees Self-service" [ref=e35] [cursor=pointer]:
          - /url: /employees
          - generic [ref=e36]:
            - generic [ref=e37]:
              - img [ref=e39]
              - generic [ref=e44]: Employees
            - generic [ref=e45]:
              - generic [ref=e46]: Self-service
              - img [ref=e47]
        - link "Leave" [ref=e49] [cursor=pointer]:
          - /url: /leave
          - generic [ref=e50]:
            - generic [ref=e51]:
              - img [ref=e53]
              - generic [ref=e55]: Leave
            - img [ref=e57]
        - link "Pilot help Guide" [ref=e59] [cursor=pointer]:
          - /url: /pilot-help
          - generic [ref=e60]:
            - generic [ref=e61]:
              - img [ref=e63]
              - generic [ref=e70]: Pilot help
            - generic [ref=e71]:
              - generic [ref=e72]: Guide
              - img [ref=e73]
      - generic [ref=e76]:
        - generic [ref=e77]:
          - generic [ref=e79]: HL
          - generic [ref=e80]:
            - paragraph [ref=e81]: Hannah Lee
            - paragraph [ref=e82]: hannah.lee@northstar.test
        - generic [ref=e83]:
          - generic [ref=e84]: employee
          - button "Log out" [ref=e85] [cursor=pointer]:
            - img
            - text: Log out
    - generic [ref=e86]:
      - banner [ref=e87]:
        - generic [ref=e88]:
          - generic [ref=e89]:
            - paragraph [ref=e90]: Secure HR operations workspace
            - heading "Leave workflows" [level=2] [ref=e91]
          - generic [ref=e92]:
            - generic [ref=e93]: All routes and actions are role-checked.
            - button "Alerts" [ref=e94] [cursor=pointer]:
              - img
              - text: Alerts
      - main [ref=e95]:
        - generic [ref=e96]:
          - generic [ref=e98]:
            - heading "Leave workflow" [level=3] [ref=e99]
            - paragraph [ref=e100]: The workflow includes request submission, role-based approvals, automatic balance updates, and a calendar-style overview for operational planning.
          - generic [ref=e101]:
            - generic [ref=e102]:
              - generic [ref=e103]: Leave pilot guidance
              - generic [ref=e104]: Keep this checklist visible while running the internal pilot.
            - generic [ref=e105]:
              - paragraph [ref=e106]: Employees and managers should submit requests from the form on the left, while approvers should then confirm the request appears in the queue with the correct scoped employee name.
              - paragraph [ref=e107]: Managers, HR, and administrators can approve pending requests directly from the queue. Employees should only verify their own leave history and must not expect approval controls.
          - generic [ref=e108]:
            - generic [ref=e109]:
              - generic [ref=e111]: Create leave request
              - generic [ref=e112]:
                - generic [ref=e113]:
                  - generic [ref=e114]: Employee
                  - combobox [ref=e115] [cursor=pointer]:
                    - img
                - generic [ref=e116]:
                  - generic [ref=e117]: Leave type
                  - combobox [ref=e118] [cursor=pointer]:
                    - generic: Annual
                    - img
                - generic [ref=e119]:
                  - generic [ref=e120]: Start date
                  - textbox [ref=e121]
                - generic [ref=e122]:
                  - generic [ref=e123]: End date
                  - textbox [ref=e124]
                - generic [ref=e125]:
                  - generic [ref=e126]: Days requested
                  - spinbutton [ref=e127]: "1"
                - generic [ref=e128]:
                  - generic [ref=e129]: Notes
                  - textbox [ref=e130]
                - button "Submit request" [ref=e131] [cursor=pointer]
            - generic [ref=e132]:
              - generic [ref=e133]:
                - generic [ref=e135]: Approval queue
                - generic [ref=e138]:
                  - generic [ref=e139]:
                    - paragraph [ref=e140]: Hannah Lee
                    - paragraph [ref=e141]: annual · 2026-04-21 to 2026-04-23
                  - generic [ref=e143]: pending
              - generic [ref=e144]:
                - generic [ref=e146]: Leave calendar view
                - generic [ref=e148]:
                  - paragraph [ref=e149]: Hannah Lee · annual
                  - paragraph [ref=e150]: 4/20/2026 → 4/22/2026
                  - generic [ref=e151]: pending
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test.describe("pilot rollout flows", () => {
  4  |   test("admin can open pilot help and download the human-friendly CSV sample", async ({ page }) => {
  5  |     await page.goto("/pilot-help?impersonate=off");
  6  | 
  7  |     await expect(page.getByRole("heading", { name: "Pilot tester help" }).last()).toBeVisible();
  8  |     await expect(page.getByText("Human-friendly employee CSV sample")).toBeVisible();
  9  | 
  10 |     const downloadPromise = page.waitForEvent("download");
  11 |     await page.getByRole("button", { name: "Download pack" }).first().click();
  12 |     const download = await downloadPromise;
  13 | 
  14 |     expect(download.suggestedFilename()).toBe("pilot-human-friendly-employee-import.csv");
  15 |   });
  16 | 
  17 |   test("admin can access the bulk CSV workspace from employee records", async ({ page }) => {
  18 |     await page.goto("/employees?impersonate=off");
  19 | 
  20 |     await expect(page.getByRole("heading", { name: "Employee records" })).toBeVisible();
  21 |     await expect(page.getByText("Bulk CSV administration")).toBeVisible();
  22 |     await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  23 |     await expect(page.getByRole("button", { name: "Load CSV template" })).toBeVisible();
  24 |     await expect(page.getByRole("button", { name: "Import CSV" })).toBeVisible();
  25 |   });
  26 | 
  27 |   test("manager impersonation keeps navigation scoped and blocks admin-only access", async ({ page }) => {
  28 |     await page.goto("/?impersonate=manager");
  29 | 
  30 |     await expect(page.getByText("Manager dashboard")).toBeVisible();
  31 |     await expect(page.getByRole("link", { name: /Dashboard/i })).toBeVisible();
  32 |     await expect(page.getByRole("link", { name: /Employees/i })).toBeVisible();
  33 |     await expect(page.getByRole("link", { name: /Leave/i })).toBeVisible();
  34 |     await expect(page.getByRole("link", { name: /Pilot help/i })).toBeVisible();
  35 |     await expect(page.getByRole("link", { name: /Access/i })).toHaveCount(0);
  36 |     await expect(page.getByRole("link", { name: /Compliance/i })).toHaveCount(0);
  37 | 
  38 |     await page.goto("/access?impersonate=manager");
  39 |     await expect(page.getByText("Access restricted")).toBeVisible();
  40 |   });
  41 | 
  42 |   test("employee impersonation retains self-service scope on the leave workflow", async ({ page }) => {
  43 |     await page.goto("/leave?impersonate=employee");
  44 | 
> 45 |     await expect(page.getByRole("heading", { name: "Leave workflow" })).toBeVisible();
     |                                                                         ^ Error: expect(locator).toBeVisible() failed
  46 |     await expect(page.getByText("Leave pilot guidance")).toBeVisible();
  47 |     await expect(page.getByRole("link", { name: /Pilot help/i })).toBeVisible();
  48 |     await expect(page.getByRole("link", { name: /Documents/i })).toHaveCount(0);
  49 |     await expect(page.getByRole("button", { name: /^Approve$/ })).toHaveCount(0);
  50 |   });
  51 | });
  52 | 
```