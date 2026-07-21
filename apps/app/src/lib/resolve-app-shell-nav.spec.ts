import { getManagedRolePermissions } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  isAccountModePath,
  resolveAppShellMode,
  resolveAppShellNav
} from "./resolve-app-shell-nav";
import { APP_NAV_ITEMS } from "@/config/app-nav";

describe("resolveAppShellNav", () => {
  it("detects account mode paths", () => {
    expect(isAccountModePath("/account")).toBe(true);
    expect(isAccountModePath("/account/billing")).toBe(true);
    // Personal paths must NEVER trigger account mode — they are personal regardless of tenantRole.
    expect(isAccountModePath("/profile")).toBe(false);
    expect(isAccountModePath("/settings")).toBe(false);
    expect(isAccountModePath("/profile")).toBe(false);
    expect(isAccountModePath("/dashboard")).toBe(false);
  });

  it("keeps workspace chrome on personal routes (/settings, /profile) for tenant operators", () => {
    const { mode, navItems } = resolveAppShellNav({
      pathname: "/settings",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: { tenantRole: "OWNER" }
    });

    // /settings is a personal path — shell must stay in workspace mode.
    expect(mode).toBe("workspace");
    expect(navItems.some((item) => item.href === "/dashboard")).toBe(true);
    expect(navItems.some((item) => item.href === "/account")).toBe(false);
  });

  it("returns account nav only on account routes", () => {
    const { mode, navItems } = resolveAppShellNav({
      pathname: "/account/organization",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: { tenantRole: "OWNER" }
    });

    expect(mode).toBe("account");
    expect(navItems.map((item) => item.href)).toEqual([
      "/account",
      "/account/workspaces",
      "/account/workspaces-tree",
      "/account/workspace-admins",
      "/account/access-audit",
      "/account/organization",
      "/account/members",
      "/account/billing",
      "/account/data-privacy",
      "/account/settings"
    ]);
    expect(navItems.some((item) => item.href === "/dashboard")).toBe(false);
  });

  it("returns operational account nav for organization admin", () => {
    const { navItems } = resolveAppShellNav({
      pathname: "/account/workspaces",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: { tenantRole: "ADMIN" }
    });

    expect(navItems.map((item) => item.href)).toEqual([
      "/account/workspaces",
      "/account/workspace-admins",
      "/account/access-audit",
      "/account/organization",
      "/account/settings"
    ]);
  });

  it("returns workspace nav only on workspace routes", () => {
    const { mode, navItems } = resolveAppShellNav({
      pathname: "/dashboard",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 2,
      notificationUnreadCount: 1,
      session: { tenantRole: "OWNER" }
    });

    expect(mode).toBe("workspace");
    expect(resolveAppShellMode("/dashboard")).toBe("workspace");
    // /settings is a personal path — must stay workspace mode even for owners.
    expect(resolveAppShellMode("/settings", { tenantRole: "OWNER" })).toBe("workspace");
    expect(navItems.some((item) => item.href.startsWith("/account"))).toBe(false);
    expect(navItems.find((item) => item.href === "/approvals")?.badge).toBe(2);
    expect(navItems.find((item) => item.href === "/notifications")?.badge).toBe(1);
  });

  it("returns filtered nav for project managers", () => {
    const { navItems } = resolveAppShellNav({
      pathname: "/projects",
      projectLeadOnly: true,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: undefined
    });

    expect(navItems.map((item) => item.href)).toEqual([
      "/dashboard",
      "/projects",
      "/time-tracker",
      "/notifications",
      "/team",
      "/approvals"
    ]);
  });

  it("uses capability navigation for a plain workspace member", () => {
    const { navItems } = resolveAppShellNav({
      pathname: "/timer",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 3,
      session: undefined,
      capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER"])
    });

    expect(navItems.map((item) => item.href)).toEqual([
      "/dashboard",
      "/timer",
      "/timesheet",
      "/submissions",
      "/projects",
      "/tasks",
      "/time-tracker",
      "/notifications",
      "/support"
    ]);
    expect(navItems.find((item) => item.href === "/notifications")?.badge).toBe(3);
  });

  it("returns full workspace nav for tenant admin even with member workspace role", () => {
    const { mode, navItems } = resolveAppShellNav({
      pathname: "/dashboard",
      projectLeadOnly: false,
      workspaceNavItems: APP_NAV_ITEMS,
      pendingCount: 0,
      notificationUnreadCount: 0,
      session: { tenantRole: "ADMIN" }
    });

    expect(mode).toBe("workspace");
    const hrefs = navItems.map((item) => item.href);
    expect(hrefs).toContain("/team-management");
    expect(hrefs).toContain("/project-managers");
    expect(hrefs).toContain("/workspace");
  });
});
