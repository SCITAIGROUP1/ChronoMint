import { getManagedRolePermissions } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  flattenNavSections,
  isAccountModePath,
  resolveAppShellMode,
  resolveAppShellNav
} from "./resolve-app-shell-nav";
import { APP_NAV_ITEMS } from "@/config/app-nav";

function hrefsFromNav(
  pathname: string,
  overrides: Partial<Parameters<typeof resolveAppShellNav>[0]> = {}
) {
  const { navSections } = resolveAppShellNav({
    pathname,
    projectLeadOnly: false,
    workspaceNavItems: APP_NAV_ITEMS,
    pendingCount: 0,
    notificationUnreadCount: 0,
    session: { tenantRole: "OWNER" },
    ...overrides
  });
  return flattenNavSections(navSections).map((item) => item.href);
}

function sectionLabels(
  pathname: string,
  overrides: Partial<Parameters<typeof resolveAppShellNav>[0]> = {}
) {
  const { navSections } = resolveAppShellNav({
    pathname,
    projectLeadOnly: false,
    workspaceNavItems: APP_NAV_ITEMS,
    pendingCount: 0,
    notificationUnreadCount: 0,
    session: { tenantRole: "OWNER" },
    ...overrides
  });
  return navSections.map((section) => section.label);
}

describe("resolveAppShellNav", () => {
  it("detects account mode paths", () => {
    expect(isAccountModePath("/account")).toBe(true);
    expect(isAccountModePath("/account/billing")).toBe(true);
    expect(isAccountModePath("/profile")).toBe(false);
    expect(isAccountModePath("/settings")).toBe(false);
    expect(isAccountModePath("/dashboard")).toBe(false);
  });

  it("keeps workspace chrome on personal routes (/settings, /profile) for tenant operators", () => {
    const { mode } = resolveAppShellNav({
      pathname: "/settings",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: { tenantRole: "OWNER" }
    });

    expect(mode).toBe("workspace");
    expect(hrefsFromNav("/settings")).toContain("/dashboard");
    expect(hrefsFromNav("/settings")).not.toContain("/account");
  });

  it("returns grouped account nav on account routes", () => {
    const { mode, navSections } = resolveAppShellNav({
      pathname: "/account/organization",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: { tenantRole: "OWNER" }
    });

    expect(mode).toBe("account");
    expect(navSections.map((section) => section.label)).toEqual([
      "Organization",
      "Access",
      "Billing & data"
    ]);
    expect(flattenNavSections(navSections).map((item) => item.href)).toEqual([
      "/account",
      "/account/workspaces",
      "/account/workspaces-tree",
      "/account/organization",
      "/account/workspace-admins",
      "/account/permissions-matrix",
      "/account/access-audit",
      "/account/members",
      "/account/billing",
      "/account/data-privacy",
      "/account/settings"
    ]);
    expect(flattenNavSections(navSections).some((item) => item.href === "/dashboard")).toBe(false);
  });

  it("returns operational account nav for organization admin", () => {
    expect(
      hrefsFromNav("/account/workspaces", {
        session: { tenantRole: "ADMIN" }
      })
    ).toEqual([
      "/account/workspaces",
      "/account/organization",
      "/account/workspace-admins",
      "/account/permissions-matrix",
      "/account/access-audit",
      "/account/settings"
    ]);
  });

  it("returns grouped workspace nav on workspace routes", () => {
    const { mode, navSections } = resolveAppShellNav({
      pathname: "/dashboard",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 2,
      notificationUnreadCount: 1,
      session: { tenantRole: "OWNER" }
    });

    expect(mode).toBe("workspace");
    expect(resolveAppShellMode("/dashboard")).toBe("workspace");
    expect(resolveAppShellMode("/settings", { tenantRole: "OWNER" })).toBe("workspace");
    expect(sectionLabels("/dashboard")).toEqual(["Workspace", "My time", "Support"]);
    expect(flattenNavSections(navSections).some((item) => item.href.startsWith("/account"))).toBe(
      false
    );
    expect(flattenNavSections(navSections).find((item) => item.href === "/approvals")?.badge).toBe(
      2
    );
    expect(
      flattenNavSections(navSections).find((item) => item.href === "/notifications")?.badge
    ).toBe(1);
  });

  it("returns filtered nav for project managers", () => {
    expect(
      hrefsFromNav("/projects", {
        projectLeadOnly: true,
        session: undefined
      })
    ).toEqual([
      "/dashboard",
      "/projects",
      "/team-time-tracker",
      "/team",
      "/approvals",
      "/overview",
      "/my-projects",
      "/time-tracker",
      "/notifications"
    ]);
  });

  it("uses capability navigation for a plain workspace member", () => {
    const { navSections } = resolveAppShellNav({
      pathname: "/timer",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 3,
      session: undefined,
      capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER"])
    });

    expect(flattenNavSections(navSections).map((item) => item.href)).toEqual([
      "/dashboard",
      "/tasks",
      "/overview",
      "/timer",
      "/timesheet",
      "/submissions",
      "/my-projects",
      "/time-tracker",
      "/notifications",
      "/support"
    ]);
    expect(
      flattenNavSections(navSections).find((item) => item.href === "/notifications")?.badge
    ).toBe(3);
    expect(flattenNavSections(navSections).some((item) => item.href === "/team-time-tracker")).toBe(
      false
    );
    expect(flattenNavSections(navSections).some((item) => item.href === "/projects")).toBe(false);
  });

  it("returns full workspace nav for tenant admin even with member workspace role", () => {
    const { mode, navSections } = resolveAppShellNav({
      pathname: "/dashboard",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: { tenantRole: "ADMIN" }
    });

    expect(mode).toBe("workspace");
    const hrefs = flattenNavSections(navSections).map((item) => item.href);
    expect(hrefs).toContain("/team-management");
    expect(hrefs).toContain("/project-managers");
    expect(hrefs).toContain("/workspace");
  });

  it("gives admins both team and personal time trackers", () => {
    const { navSections } = resolveAppShellNav({
      pathname: "/dashboard",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: undefined,
      capabilities: getManagedRolePermissions(["WORKSPACE_ADMIN"])
    });

    const hrefs = flattenNavSections(navSections).map((item) => item.href);
    expect(hrefs).toContain("/team-time-tracker");
    expect(hrefs).toContain("/time-tracker");
  });
});
