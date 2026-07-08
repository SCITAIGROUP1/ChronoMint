import type { WorkspaceDataInvalidateScope } from "@kloqra/contracts";
import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { invalidateWorkspaceQueries } from "../query/invalidate-workspace-queries";
import { applyTimelogCachePatch, type TimelogCachePatch } from "../query/patch-timelog-list-caches";
import { getQueryClient } from "../query/query-client";
import { timelogQueryKeys } from "../query/timelog-query-keys";
import { invalidateWorkspaceData } from "./workspace-data-sync";

/** All scopes that must refresh after any timelog mutation. */
export const TIMELOG_MUTATION_SCOPES: WorkspaceDataInvalidateScope[] = [
  "timelogs",
  "timesheet",
  "submissions"
];

/** @deprecated Use TIMELOG_MUTATION_SCOPES */
export const TIMELOG_INVALIDATE_SCOPES = TIMELOG_MUTATION_SCOPES;

/** @deprecated Use TIMELOG_MUTATION_SCOPES */
export const TIMELOG_DERIVED_INVALIDATE_SCOPES = TIMELOG_MUTATION_SCOPES;

function clearTimelogInflightRequests(): void {
  clearInflightGetRequestsForPath("/timelogs");
}

/** Broadcast timelog stale to every mounted view (timesheet, tracker, dashboard, timer). */
export async function invalidateTimelogData(workspaceId: string): Promise<void> {
  clearTimelogInflightRequests();
  await invalidateWorkspaceQueries(workspaceId, TIMELOG_MUTATION_SCOPES);
  invalidateWorkspaceData(workspaceId, TIMELOG_MUTATION_SCOPES);
}

/** Refresh the current view, then notify other views. Call after create/update/delete. */
export async function commitTimelogMutation(
  workspaceId: string,
  localRefresh?: () => void | Promise<void>,
  cachePatch?: TimelogCachePatch
): Promise<void> {
  clearTimelogInflightRequests();
  const client = getQueryClient();
  await client.cancelQueries({ queryKey: timelogQueryKeys.workspace(workspaceId) });

  if (cachePatch) {
    applyTimelogCachePatch(workspaceId, cachePatch);
  }
  if (localRefresh) {
    await localRefresh();
  }

  await client.refetchQueries({
    queryKey: timelogQueryKeys.workspace(workspaceId),
    type: "active"
  });

  await invalidateWorkspaceQueries(workspaceId, TIMELOG_MUTATION_SCOPES);
  invalidateWorkspaceData(workspaceId, TIMELOG_MUTATION_SCOPES);
}
