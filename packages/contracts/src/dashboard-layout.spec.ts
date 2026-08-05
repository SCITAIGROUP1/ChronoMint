import { describe, expect, it } from "vitest";
import {
  getWorkspaceDashboardLayout,
  mergeDashboardLayoutUpdate,
  updateDashboardLayoutSchema
} from "./dashboard-layout";
import { parseUserPreferences } from "./user-preferences";

const workspaceId = "00000000-0000-4000-8000-000000000001";
const layout = [{ i: "stat_total_hours", x: 0, y: 0, w: 3, h: 2, visible: true }];

describe("dashboard-layout", () => {
  it("merges layout per workspace and app", () => {
    const merged = mergeDashboardLayoutUpdate(parseUserPreferences({}), workspaceId, {
      app: "app",
      layout
    });
    expect(getWorkspaceDashboardLayout(merged, workspaceId, "app").layout).toEqual(layout);
  });

  it("preserves other workspaces when updating one", () => {
    const otherId = "00000000-0000-4000-8000-000000000002";
    const base = mergeDashboardLayoutUpdate(parseUserPreferences({}), otherId, {
      app: "app",
      layout
    });
    const merged = mergeDashboardLayoutUpdate(base, workspaceId, {
      app: "app",
      defaultLayout: layout
    });
    expect(getWorkspaceDashboardLayout(merged, otherId, "app").layout).toEqual(layout);
    expect(getWorkspaceDashboardLayout(merged, workspaceId, "app").defaultLayout).toEqual(layout);
  });

  it("requires layout or defaultLayout on update", () => {
    const result = updateDashboardLayoutSchema.safeParse({ app: "app" });
    expect(result.success).toBe(false);
  });

  it("rejects removed client and admin dashboard namespaces", () => {
    expect(updateDashboardLayoutSchema.safeParse({ app: "client", layout }).success).toBe(false);
    expect(updateDashboardLayoutSchema.safeParse({ app: "admin", layout }).success).toBe(false);
  });
});
