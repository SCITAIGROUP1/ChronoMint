import { getManagedRolePermissions } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS, filterNavByCapabilities } from "./app-nav";

describe("unified capability navigation", () => {
  it("gives a member personal work without management links", () => {
    const capabilities = getManagedRolePermissions(["WORKSPACE_MEMBER"]);
    const hrefs = filterNavByCapabilities(APP_NAV_ITEMS, capabilities).map((item) => item.href);

    expect(hrefs).toEqual([
      "/dashboard",
      "/overview",
      "/timer",
      "/timesheet",
      "/submissions",
      "/projects",
      "/tasks",
      "/time-tracker",
      "/notifications",
      "/support"
    ]);
  });

  it("adds project-scoped operations for project managers", () => {
    const capabilities = getManagedRolePermissions(["WORKSPACE_MEMBER", "PROJECT_MANAGER"]);
    const hrefs = filterNavByCapabilities(APP_NAV_ITEMS, capabilities).map((item) => item.href);

    expect(hrefs).toContain("/approvals");
    expect(hrefs).toContain("/team");
    expect(hrefs).not.toContain("/team-management");
    expect(hrefs).not.toContain("/billing");
  });

  it("adds workspace management without hiding personal work for admins", () => {
    const capabilities = getManagedRolePermissions(["WORKSPACE_ADMIN"]);
    const hrefs = filterNavByCapabilities(APP_NAV_ITEMS, capabilities).map((item) => item.href);

    expect(hrefs).toContain("/timer");
    expect(hrefs).toContain("/team-management");
    expect(hrefs).toContain("/categories");
    expect(hrefs).toContain("/billing");
    expect(hrefs).toContain("/exports");
  });
});
