import { describe, expect, it } from "vitest";
import { getCategoryConfirmCopy } from "./category-confirmation";

describe("getCategoryConfirmCopy", () => {
  it("describes delete impact including task reassignment", () => {
    const copy = getCategoryConfirmCopy("delete", { name: "DevOps", taskCount: 3 });
    expect(copy.title).toBe('Delete "DevOps"?');
    expect(copy.description).toContain("3 tasks");
    expect(copy.description).toContain("Uncategorized");
    expect(copy.destructive).toBe(true);
  });

  it("describes deactivate impact on time logging", () => {
    const copy = getCategoryConfirmCopy("deactivate", { name: "Meetings", taskCount: 1 });
    expect(copy.title).toBe('Deactivate "Meetings"?');
    expect(copy.description).toContain("read-only");
    expect(copy.confirmLabel).toBe("Deactivate");
  });

  it("describes activate requirements", () => {
    const copy = getCategoryConfirmCopy("activate", { name: "QA", taskCount: 0 });
    expect(copy.title).toBe('Activate "QA"?');
    expect(copy.description).toContain("No tasks are currently assigned");
    expect(copy.description).toContain("project are also active");
    expect(copy.destructive).toBe(false);
  });
});
