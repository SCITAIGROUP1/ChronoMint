import { describe, expect, it } from "vitest";
import { getTaskConfirmCopy } from "./task-confirmation";

describe("getTaskConfirmCopy", () => {
  const base = {
    taskName: "Design review",
    categoryName: "Development",
    categoryIsActive: true,
    projectIsActive: true
  };

  it("describes delete impact on linked time entries", () => {
    const copy = getTaskConfirmCopy("delete", base);
    expect(copy.title).toBe('Delete "Design review"?');
    expect(copy.description).toContain("Uncategorized Task");
    expect(copy.destructive).toBe(true);
  });

  it("describes deactivate impact on time logging", () => {
    const copy = getTaskConfirmCopy("deactivate", base);
    expect(copy.title).toBe('Deactivate "Design review"?');
    expect(copy.description).toContain("read-only");
    expect(copy.confirmLabel).toBe("Deactivate");
  });

  it("describes activate requirements when parents are active", () => {
    const copy = getTaskConfirmCopy("activate", base);
    expect(copy.title).toBe('Activate "Design review"?');
    expect(copy.description).toContain("Development");
    expect(copy.destructive).toBe(false);
  });

  it("mentions inactive parents on activate", () => {
    const copy = getTaskConfirmCopy("activate", {
      ...base,
      projectIsActive: false,
      categoryIsActive: false
    });
    expect(copy.description).toContain("project and this task's category are currently inactive");
  });
});
