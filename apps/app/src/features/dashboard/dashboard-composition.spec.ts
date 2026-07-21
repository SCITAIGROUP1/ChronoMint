import type { AuthSessionDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  getDashboardComposition,
  isDashboardWidgetAllowed,
  isManagementWidgetAllowed
} from "./dashboard-composition";

const BASE_SESSION: AuthSessionDto = {
  user: { id: "00000000-0000-4000-8000-000000000001", name: "Member" },
  tenantId: "00000000-0000-4000-8000-000000000002",
  workspaceId: "00000000-0000-4000-8000-000000000003",
  workspaceName: "Workspace",
  workspaceRole: "MEMBER"
};

describe("unified dashboard composition", () => {
  it.each([
    ["personal_category_split", "personal:ManageTimelogs"],
    ["personal_project_split", "personal:ListProjects"],
    ["personal_weekly_progress", "personal:ManageTimelogs"],
    ["personal_quick_timer", "personal:ManageTimer"],
    ["personal_today_logs", "personal:ManageTimelogs"]
  ] as const)("allows restored widget %s with %s", (id, capability) => {
    expect(isDashboardWidgetAllowed({ id, scope: "personal" }, [capability])).toBe(true);
  });

  it("keeps a plain member on personal widgets without management data access", () => {
    const composition = getDashboardComposition({
      ...BASE_SESSION,
      capabilities: [
        "workspace:Access",
        "personal:ManageTimer",
        "personal:ManageTimelogs",
        "personal:SubmitTimesheets",
        "personal:ListProjects"
      ]
    });

    expect(composition).toMatchObject({
      showPersonal: true,
      showManagement: false,
      workspaceWide: false,
      projectIds: []
    });
    expect(isManagementWidgetAllowed("revenue_trend", composition.capabilities)).toBe(false);
    expect(isManagementWidgetAllowed("pending_timesheets", composition.capabilities)).toBe(false);
    expect(isManagementWidgetAllowed("live_presence", composition.capabilities)).toBe(false);
    expect(
      isDashboardWidgetAllowed(
        { id: "personal_daily_progress", scope: "personal" },
        composition.capabilities
      )
    ).toBe(true);
    expect(
      isDashboardWidgetAllowed(
        { id: "team_utilization", scope: "management" },
        composition.capabilities
      )
    ).toBe(false);
  });

  it("scopes project managers to the managed project snapshot", () => {
    const composition = getDashboardComposition({
      ...BASE_SESSION,
      managedProjectIds: [
        "00000000-0000-4000-8000-000000000004",
        "00000000-0000-4000-8000-000000000005"
      ],
      capabilities: [
        "personal:ManageTimelogs",
        "project:ReadReports",
        "project:ReadPresence",
        "project:ReviewTimesheets"
      ]
    });

    expect(composition.showManagement).toBe(true);
    expect(composition.workspaceWide).toBe(false);
    expect(composition.projectIds).toEqual([
      "00000000-0000-4000-8000-000000000004",
      "00000000-0000-4000-8000-000000000005"
    ]);
    expect(isManagementWidgetAllowed("hourly_rates", composition.capabilities)).toBe(false);
    expect(isManagementWidgetAllowed("live_presence", composition.capabilities)).toBe(true);
    expect(isManagementWidgetAllowed("pending_timesheets", composition.capabilities)).toBe(true);
    expect(
      isDashboardWidgetAllowed(
        { id: "personal_today", scope: "personal" },
        composition.capabilities
      )
    ).toBe(true);
  });

  it("shows workspace management widgets to an admin capability snapshot", () => {
    const composition = getDashboardComposition({
      ...BASE_SESSION,
      workspaceRole: "ADMIN",
      capabilities: [
        "personal:ManageTimelogs",
        "workspace:ReadReports",
        "workspace:ManageBillingRates",
        "workspace:ReadPresence",
        "project:ReviewTimesheets"
      ]
    });

    expect(composition.showManagement).toBe(true);
    expect(composition.workspaceWide).toBe(true);
    expect(isManagementWidgetAllowed("hourly_rates", composition.capabilities)).toBe(true);
    expect(isManagementWidgetAllowed("revenue_trend", composition.capabilities)).toBe(true);
    expect(isManagementWidgetAllowed("pending_timesheets", composition.capabilities)).toBe(true);
    expect(
      isDashboardWidgetAllowed(
        { id: "personal_quick_access", scope: "personal" },
        composition.capabilities
      )
    ).toBe(false);
  });
});
