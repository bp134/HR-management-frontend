import { expect, test, type Page } from "@playwright/test";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

type Role = "admin" | "hr" | "manager" | "employee";
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: Role): TrpcContext {
  const user: AuthenticatedUser = {
    id: role === "admin" ? 1 : role === "hr" ? 2 : role === "manager" ? 3 : 4,
    openId: `${role}-openid`,
    email: role === "manager" ? "marcus.shaw@northstar.test" : role === "employee" ? "hannah.lee@northstar.test" : `${role}@example.com`,
    name: role === "admin" ? "Admin User" : role === "hr" ? "HR User" : role === "manager" ? "Marcus Shaw" : "Hannah Lee",
    role,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: { host: "employee-management-mvp.manus.space" },
    } as TrpcContext["req"],
    res: {
      setHeader() {
        return undefined;
      },
    } as TrpcContext["res"],
  };
}

function buildHumanFriendlyCsv(employeeNumber: string, niNumber: string) {
  return [
    "employeeNumber,firstName,lastName,email,phone,dateOfBirth,niNumber,addressLine1,addressLine2,city,postcode,departmentId,managerId,jobTitle,employmentStatus,startDate,contractType,salaryBasis,salaryAmount,hoursPerWeek,contractEndDate,probationEndDate,documentCategory,documentName,documentExpiryDate,departmentCode,departmentName,managerEmployeeNumber,managerEmail",
    `${employeeNumber},Avery,Automation,avery.automation+${employeeNumber.toLowerCase()}@northstar.test,+44 7700 880011,1992-03-14,${niNumber},7 Pilot Street,,Leeds,LS1 4AB,,,HR Coordinator,active,2026-04-16,permanent,annual,43500,37.5,,,id,Passport,2031-03-14,,People Operations,,alice.morgan@northstar.test`,
  ].join("\n");
}

async function expectAuditEntry(page: Page, action: string, details?: RegExp | string) {
  await page.goto("/audit?impersonate=off");

  const entry = page.locator("div.rounded-2xl.border").filter({
    has: page.getByText(action, { exact: true }),
  }).first();

  await expect(entry).toBeVisible();

  if (details) {
    await expect(entry.getByText(details)).toBeVisible();
  }
}

test.describe("pilot rollout flows", () => {
  test("admin can download a screen checklist and submit pilot feedback from the dashboard", async ({ page }) => {
    const feedbackSummary = `Dashboard feedback ${Date.now()}`;

    await page.goto("/?impersonate=off");

    await expect(page.getByRole("heading", { name: "Administrator dashboard" })).toBeVisible();

    const checklistDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Administrator checklist" }).click();
    const checklistDownload = await checklistDownloadPromise;
    expect(checklistDownload.suggestedFilename()).toBe("admin-pilot-dashboard-checklist.md");

    await page.getByLabel("Feedback summary").fill(feedbackSummary);
    await page.getByLabel("What happened?").fill("The dashboard quick-start guidance and scoped launch points were easy to follow during the pilot walkthrough.");

    await Promise.all([
      page.waitForResponse(response => response.url().includes("hr.feedback.submit") && response.ok()),
      page.getByRole("button", { name: "Send pilot feedback" }).click(),
    ]);

    await expectAuditEntry(page, "pilot.feedback_submitted", new RegExp(feedbackSummary));
  });

  test("admin can export and import employees through the CSV workspace and verify both audit entries", async ({ page }) => {
    const employeeNumber = `EMP-E2E-${Date.now()}`;
    const niNumber = `QQ${String(Date.now()).slice(-6)}A`;
    const csvBuffer = Buffer.from(buildHumanFriendlyCsv(employeeNumber, niNumber), "utf-8");

    await page.goto("/employees?impersonate=off");

    await expect(page.getByRole("heading", { name: "Employee records" })).toBeVisible();
    await expect(page.getByText("Bulk CSV administration")).toBeVisible();

    const exportDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const exportDownload = await exportDownloadPromise;
    expect(exportDownload.suggestedFilename()).toMatch(/\.csv$/i);

    await page.locator("#employee-csv-upload").setInputFiles({
      name: `${employeeNumber}.csv`,
      mimeType: "text/csv",
      buffer: csvBuffer,
    });
    await expect(page.getByText(`${employeeNumber}.csv`)).toBeVisible();

    await page.getByRole("button", { name: "Import CSV" }).click();

    await expect(page.getByText("Last import summary")).toBeVisible();
    await expect(page.getByText(/Created\s+1\s+employee record/i)).toBeVisible();
    await expect(page.getByText(new RegExp(`Imported employee numbers: ${employeeNumber}`))).toBeVisible();

    await expectAuditEntry(page, "employee.bulk_imported", new RegExp(employeeNumber));
    await expectAuditEntry(page, "employee.bulk_exported");
  });

  test("manager impersonation keeps navigation scoped and leave approval produces an auditable browser workflow", async ({ page }) => {
    const employeeCaller = appRouter.createCaller(createContext("employee"));
    await employeeCaller.hr.leave.create({
      employeeId: 3,
      leaveType: "annual",
      startDate: "2026-09-15",
      endDate: "2026-09-16",
      daysRequested: 2,
      notes: `pilot-e2e-leave-${Date.now()}`,
    });

    await page.goto("/?impersonate=manager");

    await expect(page.getByText("Manager dashboard")).toBeVisible();
    await expect(page.getByRole("link", { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Employees/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Leave/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Pilot help/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Access/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Compliance/i })).toHaveCount(0);

    await page.goto("/access?impersonate=manager");
    await expect(page.getByText("Access restricted")).toBeVisible();

    await page.goto("/leave?impersonate=manager");
    const firstPendingApproval = page.getByRole("button", { name: "Approve" }).first();
    await expect(firstPendingApproval).toBeVisible();
    await firstPendingApproval.click();

    await expect(page.getByText("Leave request approved.")).toBeVisible();
    await expect(page.getByText("approved").first()).toBeVisible();

    await expectAuditEntry(page, "leave.approved");
  });

  test("admin can execute a compliance workflow transition from the action queue and verify the audit log", async ({ page }) => {
    await page.goto("/compliance?impersonate=off");

    const actionableCard = page.locator("div.rounded-2xl").filter({
      has: page.getByRole("button", { name: "Mark reviewed" }),
    }).first();

    await expect(actionableCard).toBeVisible();
    await actionableCard.getByRole("button", { name: "Mark reviewed" }).click();

    await expect(page.getByText("Reviewed", { exact: true }).first()).toBeVisible();

    await expectAuditEntry(page, "compliance.reviewed");
  });
});
