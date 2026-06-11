import {
  mergeDashboardLayoutUpdate,
  parseUserPreferences,
  type DashboardApp,
  type WidgetLayoutItemDto
} from "@kloqra/contracts";

/** Member client dashboard — mirrors app default with category_split surfaced. */
export const SEED_CLIENT_DASHBOARD_LAYOUT: WidgetLayoutItemDto[] = [
  { i: "stat_total_hours", x: 0, y: 0, w: 4, h: 2, visible: true },
  { i: "stat_billable", x: 4, y: 0, w: 4, h: 2, visible: true },
  { i: "stat_projects", x: 8, y: 0, w: 4, h: 2, visible: true },
  { i: "quick_timer", x: 0, y: 2, w: 6, h: 3, visible: true },
  { i: "daily_progress", x: 6, y: 2, w: 3, h: 3, visible: true },
  { i: "project_split", x: 9, y: 2, w: 3, h: 3, visible: true },
  { i: "category_split", x: 0, y: 12, w: 3, h: 3, visible: true },
  { i: "pinned_favorites", x: 0, y: 5, w: 3, h: 3, visible: true },
  { i: "recent_activity", x: 3, y: 5, w: 3, h: 3, visible: true },
  { i: "weekly_progress", x: 6, y: 5, w: 6, h: 3, visible: true },
  { i: "today_logs", x: 0, y: 8, w: 6, h: 4, visible: true },
  { i: "timesheet_submissions", x: 6, y: 8, w: 6, h: 3, visible: true }
];

/** Admin dashboard — default visible widgets for Acme workspace. */
export const SEED_ADMIN_DASHBOARD_LAYOUT: WidgetLayoutItemDto[] = [
  { i: "stat_total_hours", x: 0, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_billable", x: 3, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_projects", x: 6, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_members", x: 9, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_nonbillable", x: 0, y: 0, w: 2, h: 2, visible: false },
  { i: "stat_revenue", x: 2, y: 0, w: 2, h: 2, visible: false },
  { i: "active_timers", x: 0, y: 2, w: 2, h: 2, visible: false },
  { i: "weekly_chart", x: 0, y: 2, w: 6, h: 5, visible: true },
  { i: "budget_burndown", x: 6, y: 2, w: 6, h: 5, visible: true },
  { i: "team_utilization", x: 6, y: 2, w: 6, h: 4, visible: false },
  { i: "daily_chart", x: 0, y: 7, w: 12, h: 5, visible: false },
  { i: "revenue_trend", x: 6, y: 11, w: 6, h: 4, visible: false },
  { i: "time_of_day_heatmap", x: 0, y: 16, w: 8, h: 4, visible: false },
  { i: "breakdown_table", x: 0, y: 11, w: 7, h: 5, visible: false },
  { i: "distribution_donut", x: 7, y: 11, w: 5, h: 5, visible: false },
  { i: "billable_split_donut", x: 0, y: 16, w: 3, h: 4, visible: false },
  { i: "billability_gauge", x: 3, y: 16, w: 3, h: 4, visible: false },
  { i: "task_breakdown", x: 6, y: 16, w: 4, h: 5, visible: false },
  { i: "category_distribution", x: 0, y: 21, w: 5, h: 5, visible: false },
  { i: "category_breakdown", x: 5, y: 21, w: 7, h: 5, visible: false },
  { i: "category_project_heatmap", x: 0, y: 26, w: 8, h: 4, visible: false },
  { i: "revenue_by_project", x: 0, y: 21, w: 6, h: 5, visible: false },
  { i: "project_health", x: 6, y: 21, w: 6, h: 5, visible: false },
  { i: "rate_efficiency", x: 0, y: 26, w: 6, h: 5, visible: false },
  { i: "hours_by_member", x: 0, y: 31, w: 12, h: 5, visible: false },
  { i: "member_leaderboard", x: 0, y: 36, w: 4, h: 5, visible: false },
  { i: "hourly_rates", x: 4, y: 36, w: 4, h: 4, visible: false },
  { i: "live_presence", x: 8, y: 36, w: 4, h: 4, visible: false },
  { i: "pending_timesheets", x: 0, y: 41, w: 5, h: 5, visible: false }
];

export type SeedDashboardLayoutAssignment = {
  email: string;
  workspaceSlug: string;
  app: DashboardApp;
  layout: WidgetLayoutItemDto[];
  defaultLayout: WidgetLayoutItemDto[];
};

/** Demo accounts that ship with persisted per-workspace dashboard layouts. */
export const SEED_DASHBOARD_LAYOUT_ASSIGNMENTS: SeedDashboardLayoutAssignment[] = [
  {
    email: "member@kloqra.dev",
    workspaceSlug: "acme",
    app: "client",
    layout: SEED_CLIENT_DASHBOARD_LAYOUT,
    defaultLayout: SEED_CLIENT_DASHBOARD_LAYOUT
  },
  {
    email: "admin@kloqra.dev",
    workspaceSlug: "acme",
    app: "admin",
    layout: SEED_ADMIN_DASHBOARD_LAYOUT,
    defaultLayout: SEED_ADMIN_DASHBOARD_LAYOUT
  },
  {
    email: "ops@kloqra.dev",
    workspaceSlug: "meridian",
    app: "admin",
    layout: SEED_ADMIN_DASHBOARD_LAYOUT,
    defaultLayout: SEED_ADMIN_DASHBOARD_LAYOUT
  }
];

export function buildPreferencesWithDashboardLayouts(
  existing: unknown,
  workspaceId: string,
  app: DashboardApp,
  layout: WidgetLayoutItemDto[],
  defaultLayout: WidgetLayoutItemDto[]
) {
  const preferences = parseUserPreferences(existing);
  return mergeDashboardLayoutUpdate(preferences, workspaceId, {
    app,
    layout,
    defaultLayout
  });
}
