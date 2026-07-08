"use client";

import { ROUTES, parseWorkspaceSettings } from "@kloqra/contracts";
import type { TimesheetApprovalPeriod } from "@kloqra/contracts";
import { useMemo } from "react";
import { api } from "../api/client";
import { useWorkspaceRemoteQuery } from "../query/use-workspace-remote-query";

export type WorkspaceOperationalSettings = {
  timezone: string;
  weekStart: "monday" | "sunday";
  timesheetApprovalPeriod: TimesheetApprovalPeriod;
};

function workspaceOperationalQueryKey(workspaceId: string) {
  return ["workspace", workspaceId, "operational-settings"] as const;
}

/** Workspace TZ / week start for submit periods and admin operational views. */
export function useWorkspaceOperationalSettings(workspaceId: string, enabled = true) {
  const browserTimezone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  const query = useWorkspaceRemoteQuery(
    workspaceId,
    workspaceOperationalQueryKey(workspaceId),
    () =>
      api<{ settings?: Record<string, unknown> }>(ROUTES.WORKSPACES.BY_ID(workspaceId), {
        workspaceId
      }),
    enabled && Boolean(workspaceId)
  );

  const settings = useMemo((): WorkspaceOperationalSettings => {
    const parsed = parseWorkspaceSettings(query.data?.settings);
    return {
      timezone: parsed.timezone ?? browserTimezone ?? "UTC",
      weekStart: parsed.weekStart ?? "monday",
      timesheetApprovalPeriod: parsed.timesheetApprovalPeriod ?? "weekly"
    };
  }, [query.data?.settings, browserTimezone]);

  return {
    ...settings,
    weekStartsOn: (settings.weekStart === "sunday" ? 0 : 1) as 0 | 1,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
