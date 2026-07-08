import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { invalidateWorkspaceQueries } from "./invalidate-workspace-queries";

/** Refetch all timelog list queries for a workspace (remote/socket events). */
export async function invalidateTimelogQueries(workspaceId?: string): Promise<void> {
  if (!workspaceId) return;
  clearInflightGetRequestsForPath("/timelogs");
  await invalidateWorkspaceQueries(workspaceId, ["timelogs", "timesheet", "submissions"]);
}
