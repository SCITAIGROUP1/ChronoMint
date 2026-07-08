"use client";

import {
  WORKSPACE_DATA_STALE_EVENT,
  useWorkspaceQuerySync,
  type WorkspaceDataStaleDetail
} from "@kloqra/web-shared";
import { useEffect } from "react";
import { triggerApprovalsRefresh } from "@/lib/approvals-refresh-registry";
import { triggerTimelogRefresh } from "@/lib/timelog-refresh-registry";

/** Realtime sync: React Query invalidation + admin-specific registries. */
export function useAdminWorkspaceDataSync(workspaceId: string) {
  useWorkspaceQuerySync(workspaceId);

  useEffect(() => {
    if (!workspaceId) return;

    const onStale = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceDataStaleDetail>).detail;
      if (!detail || detail.workspaceId !== workspaceId) return;

      if (detail.scopes.includes("pending_approvals")) {
        triggerApprovalsRefresh();
      }
      if (detail.scopes.includes("timelogs") || detail.scopes.includes("timesheet")) {
        triggerTimelogRefresh();
      }
      if (detail.scopes.includes("projects") || detail.scopes.includes("tasks")) {
        triggerTimelogRefresh();
      }
    };

    window.addEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
    return () => window.removeEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
  }, [workspaceId]);
}
