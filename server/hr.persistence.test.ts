import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(user: AuthenticatedUser): TrpcContext {
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

describe.sequential("hr persistence", () => {
  afterEach(() => {
    delete process.env.HR_FORCE_DATABASE;
  });

  it("persists a newly created employee through the database-backed HR workflow", async () => {
    process.env.HR_FORCE_DATABASE = "true";

    const hrUser: AuthenticatedUser = {
      id: 2,
      openId: "hr-openid",
      email: "olivia.grant@northstar.test",
      name: "Olivia Grant",
      loginMethod: "manus",
      role: "hr",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const caller = appRouter.createCaller(createContext(hrUser));
    const uniqueSuffix = `${Date.now()}`.slice(-6);
    const employeeNumber = `EMP-DB-${uniqueSuffix}`;
    const email = `db.employee.${uniqueSuffix}@example.com`;

    const created = await caller.hr.employees.create({
      personal: {
        firstName: "Database",
        lastName: "Employee",
        dateOfBirth: "1991-06-15",
        niNumber: `QQ${uniqueSuffix}Z`,
        addressLine1: "12 Persistence Street",
        city: "Leeds",
        postcode: "LS1 2AB",
        email,
      },
      employment: {
        employeeNumber,
        departmentId: 1,
        jobTitle: "HR Analyst",
        managerId: 1,
        employmentStatus: "active",
        startDate: "2026-04-14",
      },
      contract: {
        contractType: "permanent",
        salaryBasis: "annual",
        salaryAmount: 41000,
        hoursPerWeek: 37,
        startDate: "2026-04-14",
      },
      documents: [
        {
          category: "id",
          name: "Passport",
          expiryDate: "2029-04-14",
        },
      ],
    });

    expect(created.employee.employeeNumber).toBe(employeeNumber);

    const list = await caller.hr.employees.list({
      search: employeeNumber,
      page: 1,
      pageSize: 10,
    });
    expect(list.rows.some(row => row.employeeNumber === employeeNumber)).toBe(true);

    const detail = await caller.hr.employees.detail({ employeeId: created.employee.id });
    expect(detail?.employee.email).toBe(email);
    expect(detail?.contracts.length).toBeGreaterThan(0);

    const auditEntries = await caller.hr.audit.list();
    expect(auditEntries.some(entry => entry.action === "employee.created" && entry.entityId === created.employee.uuid)).toBe(true);
  });

  it("supports compliance actions and reminder digests through the database-backed router", async () => {
    process.env.HR_FORCE_DATABASE = "true";

    const hrUser: AuthenticatedUser = {
      id: 2,
      openId: "hr-openid",
      email: "olivia.grant@northstar.test",
      name: "Olivia Grant",
      loginMethod: "manus",
      role: "hr",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const caller = appRouter.createCaller(createContext(hrUser));
    const uniqueSuffix = `${Date.now()}`.slice(-6);
    const employeeNumber = `EMP-COMP-${uniqueSuffix}`;

    const created = await caller.hr.employees.create({
      personal: {
        firstName: "Compliance",
        lastName: "Employee",
        dateOfBirth: "1990-02-10",
        niNumber: `CC${uniqueSuffix}Z`,
        addressLine1: "9 Renewal Lane",
        city: "York",
        postcode: "YO1 7AB",
        email: `compliance.employee.${uniqueSuffix}@example.com`,
      },
      employment: {
        employeeNumber,
        departmentId: 1,
        jobTitle: "Registered Nurse",
        managerId: 1,
        employmentStatus: "active",
        startDate: "2026-04-14",
      },
      contract: {
        contractType: "fixed_term",
        salaryBasis: "annual",
        salaryAmount: 39000,
        hoursPerWeek: 37,
        startDate: "2026-04-14",
        endDate: "2026-04-20",
      },
      documents: [
        {
          category: "professional_registration",
          name: "NMC Registration",
          expiryDate: "2026-04-10",
        },
      ],
    });

    await caller.hr.registrations.create({
      employeeId: created.employee.id,
      bodyName: "NMC",
      registrationNumber: `REG-${uniqueSuffix}`,
      annualExpiryDate: "2026-04-09",
      reminderDays: 30,
    });

    const complianceBefore = await caller.hr.compliance.list();
    const item = complianceBefore.items.find(
      entry => entry.employeeName.includes("Compliance Employee") && entry.entityType === "professional_registration",
    );
    expect(item).toBeDefined();
    expect(item?.currentState).toBe("open");

    const updated = await caller.hr.compliance.takeAction({
      entityType: item!.entityType,
      entityId: item!.entityId,
      state: "replacement_requested",
      note: "Renewal pack requested",
    });
    expect(updated?.item.currentState).toBe("replacement_requested");

    const digest = await caller.hr.compliance.sendReminders();
    expect(digest.sent).toBe(true);
    expect(digest.reminderCount).toBeGreaterThan(0);
    expect(digest.reminderTypes).toContain("registration_expiry");

    const complianceAfter = await caller.hr.compliance.list();
    const refreshed = complianceAfter.items.find(entry => entry.entityType === item!.entityType && entry.entityId === item!.entityId);
    expect(refreshed?.currentState).toBe("replacement_requested");

    const auditEntries = await caller.hr.audit.list();
    expect(auditEntries.some(entry => entry.action === "compliance.replacement_requested" && entry.entityType === item!.entityType && entry.entityId === String(item!.entityId))).toBe(true);
    expect(auditEntries.some(entry => entry.action === "reminder.digest.sent" && entry.entityType === "reminder_digest")).toBe(true);
  });
});
