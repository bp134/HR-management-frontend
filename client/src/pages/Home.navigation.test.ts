import { describe, expect, it } from "vitest";
import { hrNavigation } from "./Home";

describe("hr navigation", () => {
  it("provides unique render keys for visible dashboard items", () => {
    const visibleItems = hrNavigation.filter(item => !item.roles || item.roles.includes("admin"));
    const renderKeys = visibleItems.map(item => item.key ?? item.href);

    expect(new Set(renderKeys).size).toBe(renderKeys.length);
    expect(renderKeys).toContain("audit-log");
    expect(renderKeys).toContain("compliance-tracked");
  });
});
