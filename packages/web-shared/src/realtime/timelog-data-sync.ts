import type { WorkspaceDataInvalidateScope } from "@kloqra/contracts";
import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { invalidateWorkspaceQueries } from "../query/invalidate-workspace-queries";
import { occupancyQueryKeys } from "../query/occupancy-query-keys";
import { applyTimelogCachePatch, type TimelogCachePatch } from "../query/patch-timelog-list-caches";
import { getQueryClient } from "../query/query-client";
import { submissionsQueryKeys } from "../query/submissions-query-keys";
import { timelogQueryKeys } from "../query/timelog-query-keys";
import { weekSummaryQueryKeys } from "../query/week-summary-query-keys";
import { invalidateWorkspaceData, noteLocalTimelogMutation } from "./workspace-data-sync";

/** Full scopes for slow path (no cache patch) and remote/socket invalidation. */
export const TIMELOG_MUTATION_SCOPES: WorkspaceDataInvalidateScope[] = [
  "timelogs",
  "timesheet",
  "submissions"
];

/** @deprecated Use TIMELOG_MUTATION_SCOPES */
export const TIMELOG_INVALIDATE_SCOPES = TIMELOG_MUTATION_SCOPES;

/**
 * Derived data after an optimistic list patch. Never includes `timelogs` —
 * that would re-fetch lists we just patched and stack with page stale hooks.
 */
export const TIMELOG_DERIVED_INVALIDATE_SCOPES: WorkspaceDataInvalidateScope[] = [
  "submissions",
  "timesheet"
];

function clearTimelogInflightRequests(): void {
  clearInflightGetRequestsForPath("/timelogs");
}

/** One active refetch for submission locks, occupancy, and week summaries. */
async function refreshDerivedTimelogQueries(workspaceId: string): Promise<void> {
  const client = getQueryClient();
  await Promise.all([
    client.invalidateQueries({
      queryKey: submissionsQueryKeys.workspace(workspaceId),
      refetchType: "active"
    }),
    client.invalidateQueries({
      queryKey: occupancyQueryKeys.workspace(workspaceId),
      refetchType: "active"
    }),
    client.invalidateQueries({
      queryKey: weekSummaryQueryKeys.workspace(workspaceId),
      refetchType: "active"
    })
  ]);
}

/** Broadcast timelog stale to every mounted view (timesheet, tracker, dashboard, timer). */
export async function invalidateTimelogData(workspaceId: string): Promise<void> {
  clearTimelogInflightRequests();
  await invalidateWorkspaceQueries(workspaceId, TIMELOG_MUTATION_SCOPES);
  invalidateWorkspaceData(workspaceId, TIMELOG_MUTATION_SCOPES);
}

/**
 * After create/update/delete:
 * - With cachePatch: patch lists (instant UI), then one active list refetch + one derived
 *   refetch so every mounted view confirms server truth — without broadcasting `timelogs`
 *   (that stack with page/shell listeners caused the Network storm).
 * - Without cachePatch: full invalidate + broadcast (timer autostop, etc.).
 */
export async function commitTimelogMutation(
  workspaceId: string,
  localRefresh?: () => void | Promise<void>,
  cachePatch?: TimelogCachePatch
): Promise<void> {
  clearTimelogInflightRequests();
  const client = getQueryClient();
  await client.cancelQueries({ queryKey: timelogQueryKeys.workspace(workspaceId) });

  if (cachePatch) {
    // Suppress this tab's API workspace.data.stale echo (other tabs still refresh).
    noteLocalTimelogMutation(workspaceId);
    applyTimelogCachePatch(workspaceId, cachePatch);
    if (localRefresh) {
      await localRefresh();
    }
    // Marks all list caches stale; refetches only *active* ones once (mounted views).
    // Inactive views remount with refetchOnMount: "always" against the soft-stale flag.
    await client.invalidateQueries({
      queryKey: timelogQueryKeys.workspace(workspaceId),
      refetchType: "active"
    });
    await refreshDerivedTimelogQueries(workspaceId);
    // No workspace-data-stale broadcast: shell/page listeners would stack another wave.
    return;
  }

  if (localRefresh) {
    await localRefresh();
  }

  noteLocalTimelogMutation(workspaceId);
  await invalidateWorkspaceQueries(workspaceId, TIMELOG_MUTATION_SCOPES);
  invalidateWorkspaceData(workspaceId, TIMELOG_MUTATION_SCOPES);
}
