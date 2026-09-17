import { DASHBOARD_GRID_COLS, generateResponsiveLayouts } from "@kloqra/web-shared";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT,
  repairAccountOverviewLayout,
  WIDGET_REGISTRY,
  type WidgetLayoutItem
} from "./widget-registry";

describe("account overview widget layout", () => {
  it("keeps the headline KPI strip on one 12-col row", () => {
    const kpis = DEFAULT_LAYOUT.filter((item) =>
      ["kpi_plan", "kpi_workspaces", "kpi_seats"].includes(item.i)
    );
    expect(kpis).toHaveLength(3);
    expect(kpis.every((item) => item.y === 0 && item.h === 1 && item.w === 4)).toBe(true);
    expect(kpis.map((item) => item.x).sort((a, b) => a - b)).toEqual([0, 4, 8]);
  });

  it("sizes KPI widgets as a single grid row, not a stacked card", () => {
    for (const id of ["kpi_plan", "kpi_workspaces", "kpi_seats"] as const) {
      const widget = WIDGET_REGISTRY.find((entry) => entry.id === id);
      expect(widget?.defaultSize).toEqual({ w: 4, h: 1 });
      expect(widget?.minSize.h).toBe(1);
    }
  });

  it("keeps headline KPIs side by side at the desktop breakpoint", () => {
    const layouts = generateResponsiveLayouts(DEFAULT_LAYOUT, DASHBOARD_GRID_COLS);
    const kpis = layouts.lg.filter((item) =>
      ["kpi_plan", "kpi_workspaces", "kpi_seats"].includes(item.i)
    );
    expect(kpis.every((item) => item.y === 0 && item.w === 4)).toBe(true);
    expect(kpis.map((item) => item.x).sort((a, b) => a - b)).toEqual([0, 4, 8]);
  });

  it("repairs stacked full-width headline KPIs back onto one row", () => {
    const stacked: WidgetLayoutItem[] = [
      { i: "kpi_plan", x: 0, y: 0, w: 12, h: 2, visible: true },
      { i: "kpi_workspaces", x: 0, y: 2, w: 12, h: 2, visible: true },
      { i: "kpi_seats", x: 0, y: 4, w: 12, h: 2, visible: true },
      { i: "org_profile", x: 0, y: 6, w: 12, h: 2, visible: true }
    ];
    const repaired = repairAccountOverviewLayout(stacked);
    expect(
      repaired
        .filter((item) => ["kpi_plan", "kpi_workspaces", "kpi_seats"].includes(item.i))
        .map((item) => ({ i: item.i, x: item.x, y: item.y, w: item.w, h: item.h }))
    ).toEqual([
      { i: "kpi_plan", x: 0, y: 0, w: 4, h: 1 },
      { i: "kpi_workspaces", x: 4, y: 0, w: 4, h: 1 },
      { i: "kpi_seats", x: 8, y: 0, w: 4, h: 1 }
    ]);
  });

  it("closes gaps when commercial rollup widgets are missing", () => {
    const gappy: WidgetLayoutItem[] = [
      { i: "kpi_total_hours", x: 0, y: 3, w: 3, h: 1, visible: true },
      { i: "kpi_active_members", x: 6, y: 3, w: 3, h: 1, visible: true },
      { i: "kpi_active_workspaces", x: 9, y: 3, w: 3, h: 1, visible: true },
      { i: "chart_workload", x: 0, y: 4, w: 4, h: 5, visible: true },
      { i: "chart_efficiency", x: 4, y: 4, w: 4, h: 5, visible: true }
    ];
    const repaired = repairAccountOverviewLayout(gappy);
    expect(
      repaired
        .filter((item) => item.i.startsWith("kpi_"))
        .map((item) => ({ i: item.i, x: item.x, w: item.w }))
    ).toEqual([
      { i: "kpi_total_hours", x: 0, w: 4 },
      { i: "kpi_active_members", x: 4, w: 4 },
      { i: "kpi_active_workspaces", x: 8, w: 4 }
    ]);
    expect(
      repaired
        .filter((item) => item.i.startsWith("chart_"))
        .map((item) => ({ i: item.i, x: item.x, w: item.w }))
    ).toEqual([
      { i: "chart_workload", x: 0, w: 6 },
      { i: "chart_efficiency", x: 6, w: 6 }
    ]);
  });
});
