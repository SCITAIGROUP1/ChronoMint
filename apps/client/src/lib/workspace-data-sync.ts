"use client";

import {
  WORKSPACE_DATA_STALE_EVENT,
  useWorkspaceQuerySync,
  type WorkspaceDataStaleDetail
} from "@kloqra/web-shared";
import { useEffect } from "react";
import { useActiveTimerSessionStore } from "@/stores/active-timer-session.store";

/** Realtime sync: React Query invalidation + client-only session stores. */
export function useClientWorkspaceDataSync(workspaceId: string) {
  useWorkspaceQuerySync(workspaceId);

  useEffect(() => {
    if (!workspaceId) return;

    const onStale = (event: Event) => {
      const detail = (event as CustomEvent<WorkspaceDataStaleDetail>).detail;
      if (!detail || detail.workspaceId !== workspaceId) return;

      if (detail.scopes.includes("timelogs")) {
        useActiveTimerSessionStore.getState().invalidateActive(workspaceId);
      }
    };

    window.addEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
    return () => window.removeEventListener(WORKSPACE_DATA_STALE_EVENT, onStale);
  }, [workspaceId]);
}
