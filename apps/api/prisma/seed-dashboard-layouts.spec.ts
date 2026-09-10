import { widgetLayoutItemSchema } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  SEED_MANAGEMENT_DASHBOARD_LAYOUT,
  SEED_PERSONAL_DASHBOARD_LAYOUT,
  buildPreferencesWithDashboardLayouts
} from "./seed-dashboard-layouts";

const workspaceId = "00000000-0000-4000-8000-000000000001";

describe("seed-dashboard-layouts", () => {
  it("defines valid widget layout items", () => {
    for (const item of [...SEED_PERSONAL_DASHBOARD_LAYOUT, ...SEED_MANAGEMENT_DASHBOARD_LAYOUT]) {
      expect(widgetLayoutItemSchema.safeParse(item).success).toBe(true);
    }
  });

  it("merges seeded layouts into user preferences by workspace", () => {
    const merged = buildPreferencesWithDashboardLayouts(
      { dailyTargetHours: 8 },
      workspaceId,
      "app",
      SEED_PERSONAL_DASHBOARD_LAYOUT,
      SEED_PERSONAL_DASHBOARD_LAYOUT
    );

    expect(merged.dailyTargetHours).toBe(8);
    expect(merged.dashboardLayouts?.[workspaceId]?.app?.layout).toEqual(
      SEED_PERSONAL_DASHBOARD_LAYOUT
    );
  });

  it("uses the admin KPI strip as the management default top row", () => {
    const visibleTop = SEED_MANAGEMENT_DASHBOARD_LAYOUT.filter(
      (item) => item.visible && item.y === 0
    ).sort((a, b) => a.x - b.x);

    expect(visibleTop.map((item) => item.i)).toEqual([
      "stat_total_hours",
      "stat_projects",
      "stat_members",
      "stat_billable",
      "stat_nonbillable"
    ]);
    expect(visibleTop.find((item) => item.i === "stat_billable")).toMatchObject({
      x: 8,
      w: 2,
      visible: true
    });
    expect(SEED_MANAGEMENT_DASHBOARD_LAYOUT.find((item) => item.i === "daily_chart")).toMatchObject(
      {
        x: 0,
        y: 2,
        w: 7,
        h: 5,
        visible: true
      }
    );
    expect(
      SEED_MANAGEMENT_DASHBOARD_LAYOUT.find((item) => item.i === "team_utilization")
    ).toMatchObject({ x: 7, y: 2, w: 5, h: 5, visible: true });
    expect(
      SEED_MANAGEMENT_DASHBOARD_LAYOUT.find((item) => item.i === "pending_timesheets")?.visible
    ).toBe(false);
  });

  it("uses the member overview strip as the personal default top row", () => {
    const visibleTop = SEED_PERSONAL_DASHBOARD_LAYOUT.filter(
      (item) => item.visible && item.y === 0
    ).sort((a, b) => a.x - b.x);

    expect(visibleTop.map((item) => item.i)).toEqual([
      "personal_today",
      "personal_recent_hours",
      "personal_assigned_projects",
      "personal_timesheets_action",
      "personal_daily_progress"
    ]);
    expect(
      SEED_PERSONAL_DASHBOARD_LAYOUT.find((item) => item.i === "personal_category_split")
    ).toMatchObject({ x: 6, y: 6, w: 6, h: 3, visible: true });
    expect(
      SEED_PERSONAL_DASHBOARD_LAYOUT.find((item) => item.i === "personal_today_logs")?.visible
    ).toBe(false);
  });
});
