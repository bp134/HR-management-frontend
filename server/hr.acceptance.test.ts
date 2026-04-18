import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { bulkEmployeeCsvHeaders } from "../shared/hr";
import { hrNavigation } from "../client/src/pages/Home";
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

function visibleNavigationLabels(role: Role) {
  return hrNavigation.filter(item => item.roles.includes(role)).map(item => item.label);
}

describe.sequential("hr pilot acceptance journeys", () => {
  it("covers the admin journey from authenticated access through compliance and CSV administration", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const me = await caller.auth.me();
    const navigationLabels = visibleNavigationLabels("admin");

    expect(me?.role).toBe("admin");
    expect(navigationLabels).toEqual(
      expect.arrayContaining(["Dashboard", "Employees", "Add employee", "Access", "Audit", "Compliance"]),
    );

    const exported = await caller.hr.employees.exportCsv({
      search: "",
      departmentId: null,
      status: null,
      managerId: null,
    });
    expect(exported.rowCount).toBeGreaterThan(0);
    expect(exported.csvContent.split("\n")[0]).toBe(bulkEmployeeCsvHeaders.join(","));

    const compliance = await caller.hr.compliance.list();
    const openItem = compliance.items.find(item => item.currentState === "open") ?? compliance.items[0];
    expect(openItem).toBeDefined();

    const updated = await caller.hr.compliance.takeAction({
      entityType: openItem!.entityType,
      entityId: openItem!.entityId,
      state: "reviewed",
      note: "Pilot acceptance review completed",
    });
    expect(updated?.item.currentState).toBe("reviewed");

    const uniqueSuffix = `${Date.now()}`.slice(-6);
    const employeeNumber = `EMP-ACCEPT-${uniqueSuffix}`;
    const csvRow = [
      employeeNumber,
      "Admin",
      "Journey",
      `admin.journey.${uniqueSuffix}@example.com`,
      "+44 7700 990001",
      "1991-04-10",
      `AJ${uniqueSuffix}Z`,
      "44 Acceptance Way",
      "",
      "Leeds",
      "LS1 4AD",
      "",
      "",
      "HR Coordinator",
      "active",
      "2026-04-16",
      "permanent",
      "annual",
      "41000",
      "37.5",
      "",
      "",
      "id",
      "Passport",
      "2031-04-16",
      "",
      "People Operations",
      "",
      "alice.morgan@northstar.test",
    ].join(",");

    const imported = await caller.hr.employees.importCsv({
      csvText: `${bulkEmployeeCsvHeaders.join(",")}\n${csvRow}\n`,
    });

    expect(imported.createdCount).toBe(1);
    expect(imported.errorCount).toBe(0);
    expect(imported.importedEmployeeNumbers).toContain(employeeNumber);
  });

  it("covers the manager journey with scoped navigation, team visibility, and leave approval", async () => {
    const caller = appRouter.createCaller(createContext("manager"));
    const me = await caller.auth.me();
    const navigationLabels = visibleNavigationLabels("manager");

    expect(me?.role).toBe("manager");
    expect(navigationLabels).toEqual(expect.arrayContaining(["Dashboard", "Employees", "Leave"]));
    expect(navigationLabels).not.toContain("Access");
    expect(navigationLabels).not.toContain("Audit");
    expect(navigationLabels).not.toContain("Compliance");

    const dashboard = await caller.hr.dashboard();
    expect(dashboard.userRole).toBe("manager");
    expect(dashboard.headcount).toBe(2);

    const visibleEmployee = await caller.hr.employees.detail({ employeeId: 2 });
    const hiddenEmployee = await caller.hr.employees.detail({ employeeId: 4 });
    expect(visibleEmployee?.employee.id).toBe(2);
    expect(hiddenEmployee).toBeNull();

    const leave = await caller.hr.leave.list();
    const pending = leave.requests.find(request => request.status === "pending");
    expect(pending).toBeDefined();

    await caller.hr.leave.approve({ requestId: pending!.id });
    const refreshed = await caller.hr.leave.list();
    expect(refreshed.requests.find(request => request.id === pending!.id)?.status).toBe("approved");
  });

  it("covers the employee self-service journey while denying privileged admin features", async () => {
    const caller = appRouter.createCaller(createContext("employee"));
    const me = await caller.auth.me();
    const navigationLabels = visibleNavigationLabels("employee");

    expect(me?.role).toBe("employee");
    expect(navigationLabels).toEqual(expect.arrayContaining(["Dashboard", "Employees", "Leave"]));
    expect(navigationLabels).not.toContain("Add employee");
    expect(navigationLabels).not.toContain("Access");
    expect(navigationLabels).not.toContain("Audit");
    expect(navigationLabels).not.toContain("Compliance");

    const dashboard = await caller.hr.dashboard();
    expect(dashboard.userRole).toBe("employee");
    expect(dashboard.headcount).toBe(1);

    const ownProfile = await caller.hr.employees.detail({ employeeId: 3 });
    const otherProfile = await caller.hr.employees.detail({ employeeId: 2 });
    expect(ownProfile?.employee.id).toBe(3);
    expect(otherProfile).toBeNull();

    const created = await caller.hr.leave.create({
      employeeId: 3,
      leaveType: "annual",
      startDate: "2026-06-08",
      endDate: "2026-06-09",
      daysRequested: 2,
      notes: "Pilot self-service leave submission",
    });
    expect(created.employeeId).toBe(3);
    expect(created.status).toBe("pending");

    await expect(caller.hr.employees.exportCsv({ search: "", departmentId: null, status: null, managerId: null })).rejects.toMatchObject({
      code: "FORBIDDEN",
    } satisfies Partial<TRPCError>);
    await expect(caller.hr.compliance.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    } satisfies Partial<TRPCError>);
    await expect(caller.hr.access.users()).rejects.toMatchObject({
      code: "FORBIDDEN",
    } satisfies Partial<TRPCError>);
  });

  it("allows pilot roles to submit structured feedback with route context", async () => {
    const caller = appRouter.createCaller(createContext("manager"));

    const result = await caller.hr.feedback.submit({
      screen: "Leave",
      currentRoute: "/leave?impersonate=manager",
      summary: "Scoped leave queue looks correct",
      details: "The manager queue only showed direct-report requests and the workflow action remained easy to follow.",
    });

    expect(result.success).toBe(true);
    expect(result.auditEntryId).toMatch(/^\d+$/);
  });
});
