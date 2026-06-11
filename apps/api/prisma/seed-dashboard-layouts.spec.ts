import { widgetLayoutItemSchema } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  SEED_ADMIN_DASHBOARD_LAYOUT,
  SEED_CLIENT_DASHBOARD_LAYOUT,
  SEED_DASHBOARD_LAYOUT_ASSIGNMENTS,
  buildPreferencesWithDashboardLayouts
} from "./seed-dashboard-layouts";

const workspaceId = "00000000-0000-4000-8000-000000000001";

describe("seed-dashboard-layouts", () => {
  it("defines valid widget layout items", () => {
    for (const item of [...SEED_CLIENT_DASHBOARD_LAYOUT, ...SEED_ADMIN_DASHBOARD_LAYOUT]) {
      expect(widgetLayoutItemSchema.safeParse(item).success).toBe(true);
    }
  });

  it("merges seeded layouts into user preferences by workspace", () => {
    const merged = buildPreferencesWithDashboardLayouts(
      { dailyTargetHours: 8 },
      workspaceId,
      "client",
      SEED_CLIENT_DASHBOARD_LAYOUT,
      SEED_CLIENT_DASHBOARD_LAYOUT
    );

    expect(merged.dailyTargetHours).toBe(8);
    expect(merged.dashboardLayouts?.[workspaceId]?.client?.layout).toEqual(
      SEED_CLIENT_DASHBOARD_LAYOUT
    );
  });

  it("assigns demo layouts to known seed accounts", () => {
    expect(SEED_DASHBOARD_LAYOUT_ASSIGNMENTS.map((a) => a.email)).toEqual([
      "member@kloqra.dev",
      "admin@kloqra.dev",
      "ops@kloqra.dev"
    ]);
  });
});
