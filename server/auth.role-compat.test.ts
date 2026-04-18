import { describe, expect, it } from "vitest";
import { normalizeAppRole, resolvePersistedUserRole } from "./db";

describe("auth role compatibility", () => {
  it("maps legacy persisted user roles to employee for app authorization", () => {
    expect(normalizeAppRole("user")).toBe("employee");
    expect(normalizeAppRole(undefined)).toBe("employee");
  });

  it("preserves supported app roles", () => {
    expect(normalizeAppRole("admin")).toBe("admin");
    expect(normalizeAppRole("hr")).toBe("hr");
    expect(normalizeAppRole("manager")).toBe("manager");
    expect(normalizeAppRole("employee")).toBe("employee");
  });

  it("does not force a non-owner login into a new persisted role", () => {
    expect(
      resolvePersistedUserRole({
        openId: "external-user",
        name: "External User",
        email: "external@example.com",
        loginMethod: "google",
      }),
    ).toBeUndefined();
  });

  it("still preserves explicitly assigned roles", () => {
    expect(
      resolvePersistedUserRole({
        openId: "staff-user",
        role: "hr",
      }),
    ).toBe("hr");
  });
});
