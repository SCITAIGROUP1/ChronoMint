import type { WorkspaceDataInvalidateScope } from "@kloqra/contracts";
import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { invalidateTimelogQueries } from "../query/invalidate-timelog-queries";
import { applyTimelogCachePatch, type TimelogCachePatch } from "../query/patch-timelog-list-caches";
import { getQueryClient } from "../query/query-client";
import { timelogQueryKeys } from "../query/timelog-query-keys";
import { invalidateWorkspaceData } from "./workspace-data-sync";

export const TIMELOG_INVALIDATE_SCOPES: WorkspaceDataInvalidateScope[] = ["timelogs", "timesheet"];

function clearTimelogInflightRequests(): void {
  clearInflightGetRequestsForPath("/timelogs");
}

function reapplyCachePatch(workspaceId: string, cachePatch: TimelogCachePatch): void {
  applyTimelogCachePatch(workspaceId, cachePatch);
}

/**
 * Socket + workspace stale handlers fire additional timelog invalidations after a save.
 * Re-apply the mutation result so a briefly-stale list refetch cannot win over the POST body.
 */
function scheduleCachePatchReapply(workspaceId: string, cachePatch: TimelogCachePatch): void {
  if (typeof window === "undefined") return;
  queueMicrotask(() => reapplyCachePatch(workspaceId, cachePatch));
  window.setTimeout(() => reapplyCachePatch(workspaceId, cachePatch), 0);
  window.setTimeout(() => reapplyCachePatch(workspaceId, cachePatch), 100);
}

/** Broadcast timelog stale to every mounted view (timesheet, tracker, dashboard, timer). */
export async function invalidateTimelogData(workspaceId: string): Promise<void> {
  clearTimelogInflightRequests();
  await invalidateTimelogQueries(workspaceId);
  invalidateWorkspaceData(workspaceId, TIMELOG_INVALIDATE_SCOPES);
}

/** Refresh the current view, then notify other views. Call after create/update/delete. */
export async function commitTimelogMutation(
  workspaceId: string,
  localRefresh?: () => void | Promise<void>,
  cachePatch?: TimelogCachePatch
): Promise<void> {
  clearTimelogInflightRequests();
  await getQueryClient().cancelQueries({ queryKey: timelogQueryKeys.workspace(workspaceId) });

  if (cachePatch) {
    reapplyCachePatch(workspaceId, cachePatch);
  }

  // When we have the POST/PATCH response, trust the cache patch first. An eager refetch here
  // races socket-driven invalidations and can overwrite the new entry with a stale list.
  if (localRefresh && !cachePatch) {
    await localRefresh();
  }

  await invalidateTimelogQueries(workspaceId);

  if (cachePatch) {
    reapplyCachePatch(workspaceId, cachePatch);
  }

  invalidateWorkspaceData(workspaceId, TIMELOG_INVALIDATE_SCOPES);

  if (cachePatch) {
    scheduleCachePatchReapply(workspaceId, cachePatch);
  }
}
