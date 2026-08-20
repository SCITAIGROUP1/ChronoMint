import type { AuthSessionDto, StartupPagePreference } from "@kloqra/contracts";
import { sessionCan } from "../auth/session-capabilities";

const STARTUP_PATHS: Record<StartupPagePreference, string> = {
  dashboard: "/dashboard",
  overview: "/overview",
  timer: "/timer",
  timesheet: "/timesheet",
  "time-tracker": "/time-tracker"
};

const PERSONAL_STARTUP_OPTIONS: { value: StartupPagePreference; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "timer", label: "Timer" },
  { value: "timesheet", label: "Timesheet" },
  { value: "time-tracker", label: "Time Tracker" }
];

export function canUseManagementDashboard(session: AuthSessionDto | null | undefined): boolean {
  return sessionCan(session, "workspace:ReadReports") || sessionCan(session, "project:ReadReports");
}

export function defaultWorkspaceHomePath(canUseDashboard: boolean): string {
  return canUseDashboard ? "/dashboard" : "/overview";
}

export function resolveEffectiveStartupPreference(
  preference: StartupPagePreference | undefined,
  canUseDashboard: boolean
): StartupPagePreference {
  if (!canUseDashboard) {
    if (preference === "timer" || preference === "timesheet" || preference === "time-tracker") {
      return preference;
    }
    return "overview";
  }
  return preference ?? "dashboard";
}

export function resolveStartupPath(
  preference?: StartupPagePreference,
  options?: { canUseDashboard?: boolean }
): string {
  const canUseDashboard = options?.canUseDashboard ?? true;
  return STARTUP_PATHS[resolveEffectiveStartupPreference(preference, canUseDashboard)];
}

export function resolveWorkspaceHomePath(
  session: AuthSessionDto,
  preference?: StartupPagePreference
): string {
  return resolveStartupPath(preference, {
    canUseDashboard: canUseManagementDashboard(session)
  });
}

export function startupPageSelectOptions(
  canUseDashboard: boolean
): { value: StartupPagePreference; label: string }[] {
  if (!canUseDashboard) return PERSONAL_STARTUP_OPTIONS;
  return [{ value: "dashboard", label: "Dashboard" }, ...PERSONAL_STARTUP_OPTIONS];
}
