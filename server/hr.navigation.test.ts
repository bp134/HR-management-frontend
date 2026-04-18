import { describe, expect, it } from "vitest";
import { hrNavigation } from "../client/src/pages/Home";
import { documentCategories, documentCategoryLabels } from "../shared/hr";

describe("hr navigation", () => {
  it("provides unique render keys for visible dashboard items", () => {
    const visibleItems = hrNavigation.filter(item => !item.roles || item.roles.includes("admin"));
    const renderKeys = visibleItems.map(item => item.key ?? item.href);

    expect(new Set(renderKeys).size).toBe(renderKeys.length);
    expect(renderKeys).toContain("audit-log");
    expect(renderKeys).toContain("compliance-tracked");
    expect(renderKeys).toContain("pilot-help");
  });

  it("routes audit, compliance, and pilot help to distinct destinations", () => {
    const auditItem = hrNavigation.find(item => item.key === "audit-log");
    const complianceItem = hrNavigation.find(item => item.key === "compliance-tracked");
    const pilotHelpItem = hrNavigation.find(item => item.key === "pilot-help");

    expect(auditItem?.href).toBe("/audit");
    expect(complianceItem?.href).toBe("/compliance");
    expect(pilotHelpItem?.href).toBe("/pilot-help");
    expect(pilotHelpItem?.roles).toEqual(["admin", "hr", "manager", "employee"]);
  });

  it("includes professional registration in the secured document categories", () => {
    expect(documentCategories).toContain("professional_registration");
    expect(documentCategoryLabels.professional_registration).toBe("Professional Registration");
  });
});
