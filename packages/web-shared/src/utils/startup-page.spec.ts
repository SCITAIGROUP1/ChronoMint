import { getManagedRolePermissions, type AuthSessionDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  canUseManagementDashboard,
  defaultWorkspaceHomePath,
  resolveEffectiveStartupPreference,
  resolveStartupPath,
  resolveWorkspaceHomePath,
  startupPageSelectOptions
} from "./startup-page";

const memberSession = {
  workspaceId: "ws-1",
  workspaceRole: "MEMBER",
  capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER"])
} as AuthSessionDto;

const managerSession = {
  workspaceId: "ws-1",
  workspaceRole: "MEMBER",
  managedProjectIds: ["p-1"],
  capabilities: getManagedRolePermissions(["WORKSPACE_MEMBER", "PROJECT_MANAGER"])
} as AuthSessionDto;

describe("startup page landing", () => {
  it("keeps dashboard as the management home and overview as the member home", () => {
    expect(canUseManagementDashboard(memberSession)).toBe(false);
    expect(canUseManagementDashboard(managerSession)).toBe(true);
    expect(defaultWorkspaceHomePath(false)).toBe("/overview");
    expect(defaultWorkspaceHomePath(true)).toBe("/dashboard");
  });

  it("maps a member dashboard preference to overview", () => {
    expect(resolveEffectiveStartupPreference(undefined, false)).toBe("overview");
    expect(resolveEffectiveStartupPreference("dashboard", false)).toBe("overview");
    expect(resolveEffectiveStartupPreference("overview", false)).toBe("overview");
    expect(resolveEffectiveStartupPreference("timer", false)).toBe("timer");
    expect(resolveStartupPath("dashboard", { canUseDashboard: false })).toBe("/overview");
    expect(resolveWorkspaceHomePath(memberSession)).toBe("/overview");
  });

  it("keeps dashboard for managers and admins unless they chose a personal page", () => {
    expect(resolveStartupPath(undefined, { canUseDashboard: true })).toBe("/dashboard");
    expect(resolveStartupPath("overview", { canUseDashboard: true })).toBe("/overview");
    expect(resolveWorkspaceHomePath(managerSession)).toBe("/dashboard");
    expect(resolveWorkspaceHomePath(managerSession, "timesheet")).toBe("/timesheet");
  });

  it("hides dashboard from the member startup picker", () => {
    expect(startupPageSelectOptions(false).map((option) => option.value)).toEqual([
      "overview",
      "timer",
      "timesheet",
      "time-tracker"
    ]);
    expect(startupPageSelectOptions(true)[0]?.value).toBe("dashboard");
  });
});
