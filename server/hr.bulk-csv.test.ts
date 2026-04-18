import { describe, expect, it, vi } from "vitest";
import { bulkEmployeeCsvHeaders } from "../shared/hr";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type Role = "admin" | "hr" | "manager" | "employee";
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: Role): TrpcContext {
  const user: AuthenticatedUser = {
    id: role === "admin" ? 1 : role === "hr" ? 2 : role === "manager" ? 3 : 4,
    openId: `${role}-openid`,
    email:
      role === "manager"
        ? "marcus.shaw@northstar.test"
        : role === "employee"
          ? "hannah.lee@northstar.test"
          : `${role}@example.com`,
    name:
      role === "admin"
        ? "Admin User"
        : role === "hr"
          ? "HR User"
          : role === "manager"
            ? "Marcus Shaw"
            : "Hannah Lee",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as TrpcContext["res"],
  };
}

describe.sequential("hr bulk csv", () => {
  it("exports the visible employee scope as a CSV with the shared header contract", async () => {
    const caller = appRouter.createCaller(createContext("hr"));

    const exported = await caller.hr.employees.exportCsv({ search: "", departmentId: null, status: null, managerId: null });

    expect(exported.fileName).toContain("employee-bulk-export-");
    expect(exported.rowCount).toBeGreaterThan(0);
    expect(exported.csvContent.split("\n")[0]).toBe(bulkEmployeeCsvHeaders.join(","));
    expect(exported.csvContent).toContain("EMP-1001");
    expect(exported.auditEntryId).toMatch(/^\d+$/);

    const audit = await caller.hr.audit.list();
    const exportAudit = audit.find(entry => String(entry.id) === exported.auditEntryId);
    expect(exportAudit).toMatchObject({
      action: "employee.bulk_exported",
      entityType: "employee_bulk_csv",
    });
  });

  it("imports valid employee rows while reporting row-level validation errors for invalid rows", async () => {
    const caller = appRouter.createCaller(createContext("hr"));
    const uniqueSuffix = `${Date.now()}`.slice(-6);
    const validEmployeeNumber = `EMP-CSV-${uniqueSuffix}`;

    const validRow = [
      validEmployeeNumber,
      "Casey",
      "Importer",
      `casey.importer.${uniqueSuffix}@example.com`,
      "07123456789",
      "1992-03-12",
      `QQ${uniqueSuffix}Z`,
      "12 Bulk Street",
      "Suite 3",
      "Leeds",
      "LS1 4AB",
      "",
      "",
      "Operations Analyst",
      "active",
      "2026-04-16",
      "permanent",
      "annual",
      "42000",
      "37",
      "",
      "2026-10-16",
      "id",
      "Passport",
      "2031-04-16",
      "OPS",
      "Operations",
      "EMP-1001",
      "alice.morgan@northstar.test",
    ].join(",");

    const invalidRow = [
      `EMP-BAD-${uniqueSuffix}`,
      "Invalid",
      "Manager",
      `invalid.manager.${uniqueSuffix}@example.com`,
      "",
      "1990-01-01",
      `PP${uniqueSuffix}Z`,
      "99 Error Road",
      "",
      "York",
      "YO1 1AA",
      "1",
      "999999",
      "Broken Import",
      "active",
      "2026-04-16",
      "permanent",
      "annual",
      "40000",
      "37",
      "",
      "",
      "contract",
      "Employment Contract",
      "",
    ].join(",");

    const csvText = `${bulkEmployeeCsvHeaders.join(",")}\n${validRow}\n${invalidRow}\n`;
    const result = await caller.hr.employees.importCsv({ csvText });

    expect(result.createdCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.importedEmployeeNumbers).toContain(validEmployeeNumber);
    expect(result.errors[0]?.rowNumber).toBe(3);
    expect(result.errors[0]?.message).toContain("managerId");
    expect(result.auditEntryId).toMatch(/^\d+$/);
    expect(result.errorReportFileName).toContain("employee-bulk-import-errors-");
    expect(result.errorReportCsv).toContain("row_number,employee_number,error_message");
    expect(result.errorReportCsv).toContain("managerId");

    const list = await caller.hr.employees.list({ search: validEmployeeNumber, page: 1, pageSize: 10 });
    const importedEmployee = list.rows.find(row => row.employeeNumber === validEmployeeNumber);
    expect(importedEmployee).toBeDefined();
    expect(importedEmployee?.departmentId).toBe(2);
    expect(importedEmployee?.managerId).toBe(1);

    const audit = await caller.hr.audit.list();
    const importAudit = audit.find(entry => String(entry.id) === result.auditEntryId);
    expect(importAudit).toMatchObject({
      action: "employee.bulk_imported",
      entityType: "employee_bulk_csv",
    });
  });

  it("reports explicit validation errors for duplicate identifiers, malformed email, invalid dates, and unsupported salary basis values", async () => {
    const caller = appRouter.createCaller(createContext("hr"));
    const uniqueSuffix = `${Date.now()}`.slice(-5);

    const duplicateEmployeeRow = [
      "EMP-1001",
      "Drew",
      "Duplicate",
      `drew.duplicate.${uniqueSuffix}@example.com`,
      "",
      "1991-02-10",
      `NI${uniqueSuffix}A`,
      "1 Existing Lane",
      "",
      "Leeds",
      "LS1 1LS",
      "1",
      "1",
      "Analyst",
      "active",
      "2026-04-16",
      "permanent",
      "annual",
      "42000",
      "37",
      "",
      "",
      "contract",
      "Employment Contract",
      "",
    ].join(",");

    const invalidEmailRow = [
      `EMP-EMAIL-${uniqueSuffix}`,
      "Email",
      "Failure",
      "not-an-email",
      "",
      "1991-02-10",
      `EM${uniqueSuffix}Z`,
      "2 Validation Road",
      "",
      "York",
      "YO1 1AA",
      "1",
      "1",
      "Analyst",
      "active",
      "2026-04-16",
      "permanent",
      "annual",
      "42000",
      "37",
      "",
      "",
      "contract",
      "Employment Contract",
      "",
    ].join(",");

    const invalidDateRow = [
      `EMP-DATE-${uniqueSuffix}`,
      "Date",
      "Failure",
      `date.failure.${uniqueSuffix}@example.com`,
      "",
      "1991-02-30",
      `DT${uniqueSuffix}Z`,
      "3 Validation Road",
      "",
      "York",
      "YO1 1AA",
      "1",
      "1",
      "Analyst",
      "active",
      "2026-04-16",
      "permanent",
      "annual",
      "42000",
      "37",
      "",
      "",
      "contract",
      "Employment Contract",
      "",
    ].join(",");

    const invalidSalaryBasisRow = [
      `EMP-SALARY-${uniqueSuffix}`,
      "Salary",
      "Failure",
      `salary.failure.${uniqueSuffix}@example.com`,
      "",
      "1991-02-10",
      `SB${uniqueSuffix}Z`,
      "4 Validation Road",
      "",
      "York",
      "YO1 1AA",
      "1",
      "1",
      "Analyst",
      "active",
      "2026-04-16",
      "permanent",
      "quarterly",
      "42000",
      "37",
      "",
      "",
      "contract",
      "Employment Contract",
      "",
    ].join(",");

    const csvText = `${bulkEmployeeCsvHeaders.join(",")}\n${duplicateEmployeeRow}\n${invalidEmailRow}\n${invalidDateRow}\n${invalidSalaryBasisRow}\n`;
    const result = await caller.hr.employees.importCsv({ csvText });

    expect(result.createdCount).toBe(0);
    expect(result.errorCount).toBe(4);
    expect(result.errorReportFileName).toContain("employee-bulk-import-errors-");
    expect(result.errorReportCsv).toContain("employee_number,error_message");
    expect(result.errors.map(error => error.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("employeeNumber EMP-1001 already exists"),
        expect.stringContaining("email must be a valid email address"),
        expect.stringContaining("dateOfBirth must be a valid calendar date"),
        expect.stringContaining("salaryBasis must be one of annual, monthly, weekly, daily, or hourly"),
      ]),
    );
  });

  it("reports explicit validation errors when department and manager lookup references do not resolve", async () => {
    const caller = appRouter.createCaller(createContext("hr"));
    const uniqueSuffix = `${Date.now()}`.slice(-4);

    const unresolvedLookupRow = [
      `EMP-LOOKUP-${uniqueSuffix}`,
      "Lookup",
      "Failure",
      `lookup.failure.${uniqueSuffix}@example.com`,
      "",
      "1991-02-10",
      `LK${uniqueSuffix}Z`,
      "5 Mapping Road",
      "",
      "York",
      "YO1 1AA",
      "",
      "",
      "Analyst",
      "active",
      "2026-04-16",
      "permanent",
      "annual",
      "42000",
      "37",
      "",
      "",
      "contract",
      "Employment Contract",
      "",
      "UNKNOWN",
      "Unknown Department",
      "EMP-4040",
      "missing.manager@example.com",
    ].join(",");

    const csvText = `${bulkEmployeeCsvHeaders.join(",")}
${unresolvedLookupRow}
`;
    const result = await caller.hr.employees.importCsv({ csvText });

    expect(result.createdCount).toBe(0);
    expect(result.errorCount).toBe(1);
    expect(result.errors[0]?.message).toContain("departmentId, departmentCode, or departmentName");
  });

  it("blocks employee self-service users from bulk CSV administration routes", async () => {
    const caller = appRouter.createCaller(createContext("employee"));
    const csvText = `${bulkEmployeeCsvHeaders.join(",")}\n`;

    await expect(caller.hr.employees.exportCsv({ search: "", departmentId: null, status: null, managerId: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.hr.employees.importCsv({ csvText })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
