import {
  mergeDashboardLayoutUpdate,
  parseUserPreferences,
  type DashboardApp,
  type WidgetLayoutItemDto
} from "@kloqra/contracts";

/** Personal-work dashboard — default for seeded member accounts. */
export const SEED_PERSONAL_DASHBOARD_LAYOUT: WidgetLayoutItemDto[] = [
  { i: "personal_today", x: 0, y: 0, w: 2, h: 2, visible: true },
  { i: "personal_recent_hours", x: 2, y: 0, w: 2, h: 2, visible: true },
  { i: "personal_assigned_projects", x: 4, y: 0, w: 2, h: 2, visible: true },
  { i: "personal_timesheets_action", x: 6, y: 0, w: 2, h: 2, visible: true },
  { i: "personal_daily_progress", x: 8, y: 0, w: 4, h: 2, visible: true },
  { i: "personal_quick_access", x: 0, y: 2, w: 6, h: 4, visible: true },
  { i: "personal_quick_timer", x: 6, y: 2, w: 6, h: 4, visible: true },
  { i: "personal_project_split", x: 0, y: 6, w: 6, h: 3, visible: true },
  { i: "personal_category_split", x: 6, y: 6, w: 6, h: 3, visible: true },
  { i: "personal_weekly_progress", x: 0, y: 9, w: 12, h: 7, visible: true },
  { i: "personal_today_logs", x: 0, y: 16, w: 12, h: 4, visible: false }
];

/** Management dashboard — default for seeded workspace administrators. */
export const SEED_MANAGEMENT_DASHBOARD_LAYOUT: WidgetLayoutItemDto[] = [
  { i: "stat_total_hours", x: 0, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_projects", x: 3, y: 0, w: 3, h: 2, visible: true },
  { i: "stat_members", x: 6, y: 0, w: 2, h: 2, visible: true },
  { i: "stat_billable", x: 8, y: 0, w: 2, h: 2, visible: true },
  { i: "stat_nonbillable", x: 10, y: 0, w: 2, h: 2, visible: true },
  { i: "stat_revenue", x: 2, y: 18, w: 2, h: 2, visible: false },
  { i: "daily_chart", x: 0, y: 2, w: 7, h: 5, visible: true },
  { i: "team_utilization", x: 7, y: 2, w: 5, h: 5, visible: true },
  { i: "weekly_chart", x: 0, y: 7, w: 7, h: 5, visible: true },
  { i: "distribution_donut", x: 7, y: 7, w: 5, h: 5, visible: true },
  { i: "category_project_heatmap", x: 0, y: 12, w: 7, h: 4, visible: false },
  { i: "pending_timesheets", x: 0, y: 16, w: 12, h: 5, visible: false },
  { i: "active_timers", x: 0, y: 20, w: 2, h: 2, visible: false },
  { i: "budget_burndown", x: 6, y: 20, w: 6, h: 5, visible: false },
  { i: "breakdown_table", x: 0, y: 29, w: 7, h: 5, visible: false },
  { i: "revenue_trend", x: 6, y: 29, w: 6, h: 4, visible: false },
  { i: "time_of_day_heatmap", x: 0, y: 34, w: 8, h: 4, visible: false },
  { i: "billable_split_donut", x: 0, y: 34, w: 3, h: 4, visible: false },
  { i: "billability_gauge", x: 3, y: 34, w: 3, h: 4, visible: false },
  { i: "category_distribution", x: 0, y: 39, w: 5, h: 5, visible: false },
  { i: "revenue_by_project", x: 0, y: 39, w: 6, h: 5, visible: false },
  { i: "category_breakdown", x: 5, y: 39, w: 7, h: 5, visible: false },
  { i: "project_health", x: 6, y: 39, w: 6, h: 5, visible: false },
  { i: "task_breakdown", x: 6, y: 40, w: 4, h: 5, visible: false },
  { i: "rate_efficiency", x: 0, y: 44, w: 6, h: 5, visible: false },
  { i: "hours_by_member", x: 0, y: 49, w: 12, h: 5, visible: false },
  { i: "member_leaderboard", x: 0, y: 54, w: 4, h: 5, visible: false },
  { i: "hourly_rates", x: 4, y: 54, w: 4, h: 4, visible: false },
  { i: "live_presence", x: 8, y: 54, w: 4, h: 4, visible: false }
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
