import type { AuthSessionDto, Permission } from "@kloqra/contracts";
import { getSessionCapabilities, sessionCan } from "@kloqra/web-shared";

export type DashboardComposition = {
  capabilities: Permission[];
  showPersonal: boolean;
  showManagement: boolean;
  workspaceWide: boolean;
  projectIds: string[];
};

const WIDGET_PERMISSIONS: Partial<Record<string, readonly Permission[]>> = {
  hourly_rates: ["workspace:ManageBillingRates"],
  live_presence: ["workspace:ReadPresence", "project:ReadPresence"],
  active_timers: ["workspace:ReadPresence", "project:ReadPresence"],
  pending_timesheets: ["project:ReviewTimesheets"]
};

const PERSONAL_WIDGET_PERMISSIONS: Record<string, readonly Permission[]> = {
  personal_today: ["personal:ManageTimelogs"],
  personal_recent_hours: ["personal:ManageTimelogs"],
  personal_assigned_projects: ["personal:ListProjects"],
  personal_timesheets_action: ["personal:SubmitTimesheets"],
  personal_daily_progress: ["personal:ManageTimelogs"],
  personal_quick_access: ["personal:ManageTimer", "personal:ListProjects"],
  personal_category_split: ["personal:ManageTimelogs"],
  personal_project_split: ["personal:ManageTimelogs", "personal:ListProjects"],
  personal_weekly_progress: ["personal:ManageTimelogs"],
  personal_quick_timer: ["personal:ManageTimer"],
  personal_today_logs: ["personal:ManageTimelogs", "personal:ManageTimer"]
};

export function getDashboardComposition(session: AuthSessionDto): DashboardComposition {
  const capabilities = getSessionCapabilities(session);
  const workspaceWide = sessionCan(session, "workspace:ReadReports");
  const projectReports = sessionCan(session, "project:ReadReports");

  return {
    capabilities,
    showPersonal:
      sessionCan(session, "personal:ManageTimelogs") ||
      sessionCan(session, "personal:ManageTimer") ||
      sessionCan(session, "personal:SubmitTimesheets"),
    showManagement: workspaceWide || projectReports,
    workspaceWide,
    projectIds: workspaceWide ? [] : [...(session.managedProjectIds ?? [])]
  };
}

export function isManagementWidgetAllowed(
  widgetId: string,
  capabilities: readonly Permission[]
): boolean {
  const required = WIDGET_PERMISSIONS[widgetId];
  if (!required) {
    return (
      capabilities.includes("workspace:ReadReports") || capabilities.includes("project:ReadReports")
    );
  }
  return required.some((permission) => capabilities.includes(permission));
}

export function isDashboardWidgetAllowed(
  widget: { id: string; scope: "personal" | "management" },
  capabilities: readonly Permission[]
): boolean {
  if (widget.scope === "management") {
    return isManagementWidgetAllowed(widget.id, capabilities);
  }

  const required = PERSONAL_WIDGET_PERMISSIONS[widget.id];
  return Boolean(required?.some((permission) => capabilities.includes(permission)));
}
