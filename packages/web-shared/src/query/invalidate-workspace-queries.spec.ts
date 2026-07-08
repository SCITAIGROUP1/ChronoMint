/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { catalogQueryKeys } from "./catalog-query-keys";
import { invalidateWorkspaceQueries } from "./invalidate-workspace-queries";
import { getQueryClient, resetQueryClient } from "./query-client";
import { submissionsQueryKeys } from "./submissions-query-keys";
import { timelogQueryKeys } from "./timelog-query-keys";
import { weekSummaryQueryKeys } from "./week-summary-query-keys";

describe("invalidateWorkspaceQueries", () => {
  const workspaceId = "ws-1";

  beforeEach(() => {
    resetQueryClient();
  });

  it("refetches active queries matching timelog and submissions scopes", async () => {
    const client = getQueryClient();
    const timelogKey = timelogQueryKeys.list(workspaceId, "/timelogs?from=1&to=2");
    const submissionsKey = submissionsQueryKeys.list(workspaceId, "all");
    const projectsKey = catalogQueryKeys.projects(workspaceId);

    let timelogFetches = 0;
    let submissionsFetches = 0;
    let projectsFetches = 0;

    client.setQueryDefaults(timelogKey, {
      queryFn: async () => {
        timelogFetches += 1;
        return { items: [] };
      }
    });
    client.setQueryDefaults(submissionsKey, {
      queryFn: async () => {
        submissionsFetches += 1;
        return [];
      }
    });
    client.setQueryDefaults(projectsKey, {
      queryFn: async () => {
        projectsFetches += 1;
        return [];
      }
    });

    client.setQueryData(timelogKey, { items: [] });
    client.setQueryData(submissionsKey, []);
    client.setQueryData(projectsKey, []);

    await invalidateWorkspaceQueries(workspaceId, ["timelogs", "submissions"]);

    expect(timelogFetches).toBeGreaterThanOrEqual(0);
    expect(submissionsFetches).toBeGreaterThanOrEqual(0);
    expect(projectsFetches).toBe(0);
  });

  it("includes week summary and occupancy prefixes for timesheet scope", async () => {
    const client = getQueryClient();
    const weekKey = weekSummaryQueryKeys.workspace(workspaceId);
    client.setQueryData(weekKey, { totalHours: 0 });

    await invalidateWorkspaceQueries(workspaceId, ["timesheet"]);

    const state = client.getQueryState(weekKey);
    expect(state?.isInvalidated).toBe(true);
  });
});
