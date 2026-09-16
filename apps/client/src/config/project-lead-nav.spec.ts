import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS } from "./app-nav";
import { canAccessApp, isProjectLeadOnly, projectLeadNavItems } from "./project-manager-nav";

describe("projectLeadNavItems", () => {
  it("omits workspace-management sections for project managers", () => {
    const hrefs = projectLeadNavItems().map((item) => item.href);
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/approvals");
    expect(hrefs).toContain("/projects");
    expect(hrefs).toContain("/my-projects");
    expect(hrefs).toContain("/team-time-tracker");
    expect(hrefs).toContain("/time-tracker");
    expect(hrefs).not.toContain("/exports");
    expect(hrefs).not.toContain("/team-management");
    expect(hrefs).not.toContain("/billing");
    expect(hrefs.length).toBeLessThan(APP_NAV_ITEMS.length);
  });
});

describe("canAccessApp", () => {
  it("allows workspace admin", () => {
    expect(canAccessApp("ADMIN", undefined)).toBe(true);
  });

  it("allows member with led projects", () => {
    expect(canAccessApp("MEMBER", ["proj-1"])).toBe(true);
  });

  it("denies plain member", () => {
    expect(canAccessApp("MEMBER", [])).toBe(false);
    expect(canAccessApp("MEMBER", undefined)).toBe(false);
  });
});

describe("isProjectLeadOnly", () => {
  it("detects lead-only members", () => {
    expect(isProjectLeadOnly("MEMBER", ["proj-1"])).toBe(true);
    expect(isProjectLeadOnly("ADMIN", ["proj-1"])).toBe(false);
  });
});
