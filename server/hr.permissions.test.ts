import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("hr permissions", () => {
  it("blocks managers from creating employee records", async () => {
    const caller = appRouter.createCaller(createContext("manager"));

    await expect(
      caller.hr.employees.create({
        personal: {
          firstName: "Jamie",
          lastName: "Stone",
          dateOfBirth: "1994-01-01",
          niNumber: "QQ123456Z",
          addressLine1: "1 Example Street",
          city: "Leeds",
          postcode: "LS1 1AA",
          email: "jamie@example.com",
        },
        employment: {
          employeeNumber: "EMP-2001",
          departmentId: 1,
          jobTitle: "Analyst",
          employmentStatus: "active",
          startDate: "2026-04-14",
        },
        contract: {
          contractType: "permanent",
          salaryBasis: "annual",
          salaryAmount: 32000,
          hoursPerWeek: 37,
          startDate: "2026-04-14",
        },
        documents: [],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
  });

  it("allows HR users to create employee records and records a corresponding audit event", async () => {
    const caller = appRouter.createCaller(createContext("hr"));

    const created = await caller.hr.employees.create({
      personal: {
        firstName: "Jamie",
        lastName: "Stone",
        dateOfBirth: "1994-01-01",
        niNumber: "QQ123456Z",
        addressLine1: "1 Example Street",
        city: "Leeds",
        postcode: "LS1 1AA",
        email: "jamie@example.com",
      },
      employment: {
        employeeNumber: "EMP-2002",
        departmentId: 1,
        jobTitle: "Analyst",
        employmentStatus: "active",
        startDate: "2026-04-14",
      },
      contract: {
        contractType: "permanent",
        salaryBasis: "annual",
        salaryAmount: 32000,
        hoursPerWeek: 37,
        startDate: "2026-04-14",
      },
      documents: [
        {
          category: "id",
          name: "Passport",
          expiryDate: "2027-04-14",
        },
      ],
    });

    expect(created.employee.employeeNumber).toBe("EMP-2002");

    const auditEntries = await caller.hr.audit.list();
    expect(auditEntries[0]?.action).toBe("employee.created");
    expect(auditEntries[0]?.entityType).toBe("employee");
  });

  it("updates leave balances when an approver approves a pending request", async () => {
    const caller = appRouter.createCaller(createContext("manager"));

    const before = await caller.hr.leave.list();
    const pending = before.requests.find(request => request.status === "pending");
    expect(pending).toBeTruthy();

    await caller.hr.leave.approve({ requestId: pending!.id });

    const after = await caller.hr.leave.list();
    const approved = after.requests.find(request => request.id === pending!.id);
    expect(approved?.status).toBe("approved");
  });

  it("scopes manager dashboard and employee access to their team records", async () => {
    const caller = appRouter.createCaller(createContext("manager"));

    const dashboard = await caller.hr.dashboard();
    expect(dashboard.userRole).toBe("manager");
    expect(dashboard.headcount).toBe(2);

    const visibleEmployee = await caller.hr.employees.detail({ employeeId: 2 });
    const hiddenEmployee = await caller.hr.employees.detail({ employeeId: 4 });

    expect(visibleEmployee?.employee.id).toBe(2);
    expect(hiddenEmployee).toBeNull();
  });

  it("blocks managers from viewing audit logs and document registers", async () => {
    const caller = appRouter.createCaller(createContext("manager"));

    await expect(caller.hr.audit.list()).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
    await expect(caller.hr.documents.list()).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
  });

  it("allows employees to access only their own self-service records and submit leave requests", async () => {
    const caller = appRouter.createCaller(createContext("employee"));

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
      startDate: "2026-05-06",
      endDate: "2026-05-07",
      daysRequested: 2,
      notes: "Medical appointment follow-up",
    });

    expect(created.employeeId).toBe(3);
    expect(created.status).toBe("pending");
  });

  it("blocks employees from reading sensitive operational records", async () => {
    const caller = appRouter.createCaller(createContext("employee"));

    await expect(caller.hr.audit.list()).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
    await expect(caller.hr.documents.list()).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
    await expect(caller.hr.access.users()).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
  });

  it("allows admins to change user roles and records the change in the audit log", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    const before = await caller.hr.access.users();
    const target = before.find(user => user.role === "manager");
    expect(target).toBeTruthy();

    const updated = await caller.hr.access.updateRole({ userId: target!.id, role: "hr" });
    expect(updated.role).toBe("hr");

    const auditEntries = await caller.hr.audit.list();
    expect(auditEntries[0]?.action).toBe("user.role.updated");
    expect(auditEntries[0]?.entityType).toBe("user");
  });

  it("exposes append-only audit storage policy details to authorized roles", async () => {
    const caller = appRouter.createCaller(createContext("hr"));

    const policy = await caller.hr.audit.storagePolicy();
    expect(policy.mode).toBe("append_only");
    expect(policy.guarantees).toContain("No update or delete mutation is exposed for audit records.");
  });
});
