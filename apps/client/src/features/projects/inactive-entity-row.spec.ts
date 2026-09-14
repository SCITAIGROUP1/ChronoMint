import { entityRowClassName, inactiveEntityRowClassName } from "@kloqra/ui";
import { describe, expect, it } from "vitest";

/** Contract: workspace management project/category/task lists use the shared inactive row classes. */
describe("entityRowClassName (workspace management lists)", () => {
  it("mutes inactive entity rows", () => {
    expect(entityRowClassName(false)).toBe(inactiveEntityRowClassName);
    expect(inactiveEntityRowClassName).toContain("bg-muted/40");
    expect(inactiveEntityRowClassName).toContain("text-muted-foreground");
  });

  it("merges clickable extras used by the projects list", () => {
    const classes = entityRowClassName(false, "group cursor-pointer");
    expect(classes).toContain("group");
    expect(classes).toContain("cursor-pointer");
    expect(classes).toContain("bg-muted/40");
  });

  it("leaves active rows unstyled by the helper", () => {
    expect(entityRowClassName(true, "group cursor-pointer")).toBe("group cursor-pointer");
  });

  it("maps project list status labels from isActive", () => {
    const statusLabel = (isActive: boolean) => (isActive ? "Active" : "Inactive");
    expect(statusLabel(true)).toBe("Active");
    expect(statusLabel(false)).toBe("Inactive");
  });
});
