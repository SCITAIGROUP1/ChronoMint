import { describe, expect, it } from "vitest";
import { getProjectConfirmCopy } from "./project-confirmation";

describe("getProjectConfirmCopy", () => {
  it("describes deactivate impact on time logging", () => {
    const copy = getProjectConfirmCopy("deactivate", { name: "Annual Audit" });
    expect(copy.title).toBe('Deactivate "Annual Audit"?');
    expect(copy.description).toContain("read-only");
    expect(copy.confirmLabel).toBe("Deactivate");
    expect(copy.destructive).toBe(true);
  });

  it("describes activate requirements", () => {
    const copy = getProjectConfirmCopy("activate", { name: "Client Portal" });
    expect(copy.title).toBe('Activate "Client Portal"?');
    expect(copy.description).toContain("category must be active");
    expect(copy.destructive).toBe(false);
  });
});
