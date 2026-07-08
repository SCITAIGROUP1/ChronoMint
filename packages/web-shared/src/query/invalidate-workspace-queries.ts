import type { WorkspaceDataInvalidateScope } from "@kloqra/contracts";
import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { approvalsQueryKeys } from "./approvals-query-keys";
import { catalogQueryKeys } from "./catalog-query-keys";
import { occupancyQueryKeys } from "./occupancy-query-keys";
import { getQueryClient } from "./query-client";
import { submissionsQueryKeys } from "./submissions-query-keys";
import { timelogQueryKeys } from "./timelog-query-keys";
import { weekSummaryQueryKeys } from "./week-summary-query-keys";

function queryKeysForScope(
  workspaceId: string,
  scope: WorkspaceDataInvalidateScope
): readonly (readonly unknown[])[] {
  switch (scope) {
    case "timelogs":
      return [timelogQueryKeys.workspace(workspaceId)];
    case "timesheet":
      // Occupancy + week summary only. Timelog *lists* are owned by the `timelogs` scope —
      // including them here re-fetches every patched list whenever derived scopes fire.
      return [
        weekSummaryQueryKeys.workspace(workspaceId),
        occupancyQueryKeys.workspace(workspaceId)
      ];
    case "submissions":
      return [submissionsQueryKeys.workspace(workspaceId)];
    case "projects":
      return [catalogQueryKeys.projects(workspaceId)];
    case "tasks":
      return [catalogQueryKeys.tasks(workspaceId)];
    case "pending_approvals":
      return [approvalsQueryKeys.workspace(workspaceId)];
    default:
      return [];
  }
}

function matchesQueryKey(queryKey: readonly unknown[], prefix: readonly unknown[]): boolean {
  if (queryKey.length < prefix.length) return false;
  return prefix.every((value, index) => queryKey[index] === value);
}

/** Invalidate and refetch active React Query caches for the given workspace scopes. */
export async function invalidateWorkspaceQueries(
  workspaceId: string,
  scopes: WorkspaceDataInvalidateScope[]
): Promise<void> {
  if (!workspaceId || scopes.length === 0) return;

  const prefixes = scopes.flatMap((scope) => queryKeysForScope(workspaceId, scope));
  if (prefixes.length === 0) return;

  if (scopes.includes("timelogs") || scopes.includes("timesheet")) {
    clearInflightGetRequestsForPath("/timelogs");
  }
  if (scopes.includes("projects") || scopes.includes("tasks")) {
    clearInflightGetRequestsForPath("/projects");
    clearInflightGetRequestsForPath("/tasks");
    clearInflightGetRequestsForPath("/categories");
  }

  const client = getQueryClient();
  const predicate = (query: { queryKey: readonly unknown[] }) =>
    prefixes.some((prefix) => matchesQueryKey(query.queryKey, prefix));

  await client.cancelQueries({ predicate });
  // Single pass: mark stale + refetch active. Do not also call refetchQueries —
  // that stacked a second network hop for every mount after invalidate.
  await client.invalidateQueries({ predicate, refetchType: "active" });
}
