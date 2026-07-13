import { entityRowClassName, inactiveEntityRowClassName } from "@kloqra/ui";
import { describe, expect, it } from "vitest";
import { memberProjectsStatusFilters } from "./member-projects-filters";

/** Contract: client project/task lists use the shared inactive row classes. */
describe("entityRowClassName (client lists)", () => {
  it("mutes inactive project and task rows", () => {
    expect(entityRowClassName(false)).toBe(inactiveEntityRowClassName);
    expect(inactiveEntityRowClassName).toContain("bg-muted/40");
    expect(inactiveEntityRowClassName).toContain("text-muted-foreground");
  });

  it("leaves active rows unstyled by the helper", () => {
    expect(entityRowClassName(true)).toBe("");
  });
});

describe("memberProjectsStatusFilters", () => {
  it("maps status select to list query filters", () => {
    expect(memberProjectsStatusFilters("ALL")).toBeUndefined();
    expect(memberProjectsStatusFilters("active")).toEqual({ isActive: "true" });
    expect(memberProjectsStatusFilters("inactive")).toEqual({ isActive: "false" });
  });
});
