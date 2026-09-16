"use client";

import {
  ROUTES,
  type TimesheetApprovalPeriod,
  type WorkspaceOperationalSettingsDto
} from "@kloqra/contracts";
import { useMemo } from "react";
import { api } from "../api/client";
import { useWorkspaceRemoteQuery } from "../query/use-workspace-remote-query";

export type WorkspaceOperationalSettings = {
  timezone: string;
  weekStart: "monday" | "sunday";
  timesheetApprovalPeriod: TimesheetApprovalPeriod;
  dailyTargetHours: number;
};

function workspaceOperationalQueryKey(workspaceId: string) {
  return ["workspace", workspaceId, "operational-settings"] as const;
}

/** Workspace TZ / week start / daily hours for timesheet and reports. Safe for members. */
export function useWorkspaceOperationalSettings(workspaceId: string, enabled = true) {
  const browserTimezone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  const query = useWorkspaceRemoteQuery(
    workspaceId,
    workspaceOperationalQueryKey(workspaceId),
    () =>
      api<WorkspaceOperationalSettingsDto>(ROUTES.WORKSPACES.OPERATIONAL_SETTINGS(workspaceId), {
        workspaceId
      }),
    enabled && Boolean(workspaceId)
  );

  const settings = useMemo((): WorkspaceOperationalSettings => {
    return {
      timezone: query.data?.timezone ?? browserTimezone ?? "UTC",
      weekStart: query.data?.weekStart ?? "monday",
      timesheetApprovalPeriod: query.data?.timesheetApprovalPeriod ?? "weekly",
      dailyTargetHours: query.data?.dailyTargetHours ?? 8
    };
  }, [query.data, browserTimezone]);

  return {
    ...settings,
    weekStartsOn: (settings.weekStart === "sunday" ? 0 : 1) as 0 | 1,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
