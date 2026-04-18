import type { User } from "../drizzle/schema";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticateRequest, getUserByOpenId } = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest,
  },
}));

vi.mock("./db", () => ({
  getUserByOpenId,
}));

import { createContext } from "./_core/context";
import { IMPERSONATION_HEADER, SAFE_IMPERSONATION_USERS } from "../shared/impersonation";

function buildRequest(headerValue?: string) {
  return {
    header(name: string) {
      if (name === IMPERSONATION_HEADER) {
        return headerValue;
      }
      return undefined;
    },
  } as never;
}

function buildUser(overrides: Partial<User>): User {
  return {
    id: 1,
    openId: "seed-owner-admin",
    name: "System Owner",
    email: "owner@northstar.test",
    loginMethod: "seed",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

describe("createContext impersonation override", () => {
  beforeEach(() => {
    authenticateRequest.mockReset();
    getUserByOpenId.mockReset();
  });

  it("allows an authenticated admin to impersonate an approved seeded identity in non-production", async () => {
    const adminUser = buildUser({ role: "admin", openId: "owner-admin" });
    const employeeUser = buildUser({
      id: 4,
      role: "employee",
      openId: SAFE_IMPERSONATION_USERS.employee.openId,
      email: SAFE_IMPERSONATION_USERS.employee.email,
      name: SAFE_IMPERSONATION_USERS.employee.label,
    });

    authenticateRequest.mockResolvedValue(adminUser);
    getUserByOpenId.mockResolvedValue(employeeUser);

    const context = await createContext({
      req: buildRequest(SAFE_IMPERSONATION_USERS.employee.openId),
      res: {} as never,
      info: {} as never,
    });

    expect(getUserByOpenId).toHaveBeenCalledWith(SAFE_IMPERSONATION_USERS.employee.openId);
    expect(context.user?.openId).toBe(SAFE_IMPERSONATION_USERS.employee.openId);
    expect(context.user?.role).toBe("employee");
  });

  it("ignores the override for non-admin authenticated users", async () => {
    const managerUser = buildUser({ role: "manager", openId: SAFE_IMPERSONATION_USERS.manager.openId });
    authenticateRequest.mockResolvedValue(managerUser);

    const context = await createContext({
      req: buildRequest(SAFE_IMPERSONATION_USERS.employee.openId),
      res: {} as never,
      info: {} as never,
    });

    expect(getUserByOpenId).not.toHaveBeenCalled();
    expect(context.user?.openId).toBe(SAFE_IMPERSONATION_USERS.manager.openId);
    expect(context.user?.role).toBe("manager");
  });

  it("ignores unknown impersonation targets even for admins", async () => {
    const adminUser = buildUser({ role: "admin", openId: "owner-admin" });
    authenticateRequest.mockResolvedValue(adminUser);

    const context = await createContext({
      req: buildRequest("random-user"),
      res: {} as never,
      info: {} as never,
    });

    expect(getUserByOpenId).not.toHaveBeenCalled();
    expect(context.user?.openId).toBe("owner-admin");
    expect(context.user?.role).toBe("admin");
  });
});
