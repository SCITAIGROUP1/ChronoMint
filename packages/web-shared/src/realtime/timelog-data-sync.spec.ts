/** @vitest-environment jsdom */
import type { TimeLogDto } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearInflightGetRequestsForPath } from "../api/inflight-requests";
import { invalidateWorkspaceQueries } from "../query/invalidate-workspace-queries";
import { applyTimelogCachePatch } from "../query/patch-timelog-list-caches";
import { getQueryClient, resetQueryClient } from "../query/query-client";
import { timelogQueryKeys } from "../query/timelog-query-keys";
import {
  commitTimelogMutation,
  invalidateTimelogData,
  TIMELOG_MUTATION_SCOPES
} from "./timelog-data-sync";
import { invalidateWorkspaceData } from "./workspace-data-sync";

vi.mock("../api/inflight-requests", () => ({
  clearInflightGetRequestsForPath: vi.fn()
}));

vi.mock("../query/invalidate-workspace-queries", () => ({
  invalidateWorkspaceQueries: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../query/patch-timelog-list-caches", () => ({
  applyTimelogCachePatch: vi.fn()
}));

vi.mock("./workspace-data-sync", () => ({
  invalidateWorkspaceData: vi.fn()
}));

describe("timelog-data-sync", () => {
  const workspaceId = "00000000-0000-4000-8000-000000000099";
  const sampleLog: TimeLogDto = {
    id: "log-1",
    userId: "user-1",
    taskId: "task-1",
    startTime: "2026-07-08T02:00:00.000Z",
    endTime: "2026-07-08T03:00:00.000Z",
    durationSec: 3600,
    description: null,
    isBillable: true,
    source: "manual"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryClient();
  });

  it("invalidates inflight requests, query cache, and workspace scopes", async () => {
    await invalidateTimelogData(workspaceId);

    expect(clearInflightGetRequestsForPath).toHaveBeenCalledWith("/timelogs");
    expect(invalidateWorkspaceQueries).toHaveBeenCalledWith(workspaceId, TIMELOG_MUTATION_SCOPES);
    expect(invalidateWorkspaceData).toHaveBeenCalledWith(workspaceId, TIMELOG_MUTATION_SCOPES);
  });

  it("runs local refresh, refetches active queries, and broadcasts all scopes", async () => {
    const localRefresh = vi.fn().mockResolvedValue(undefined);
    const client = getQueryClient();
    const cancelSpy = vi.spyOn(client, "cancelQueries");
    const refetchSpy = vi.spyOn(client, "refetchQueries").mockResolvedValue(undefined as never);

    await commitTimelogMutation(workspaceId, localRefresh);

    expect(cancelSpy).toHaveBeenCalled();
    expect(localRefresh).toHaveBeenCalled();
    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: timelogQueryKeys.workspace(workspaceId),
      type: "active"
    });
    expect(invalidateWorkspaceQueries).toHaveBeenCalledWith(workspaceId, TIMELOG_MUTATION_SCOPES);
    expect(invalidateWorkspaceData).toHaveBeenCalledWith(workspaceId, TIMELOG_MUTATION_SCOPES);
  });

  it("patches cache, runs local refresh, refetches active queries, and broadcasts all scopes", async () => {
    const localRefresh = vi.fn().mockResolvedValue(undefined);
    const patch = { type: "upsert" as const, log: sampleLog };
    const client = getQueryClient();
    const refetchSpy = vi.spyOn(client, "refetchQueries").mockResolvedValue(undefined as never);

    await commitTimelogMutation(workspaceId, localRefresh, patch);

    expect(applyTimelogCachePatch).toHaveBeenCalledOnce();
    expect(applyTimelogCachePatch).toHaveBeenCalledWith(workspaceId, patch);
    expect(localRefresh).toHaveBeenCalled();
    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: timelogQueryKeys.workspace(workspaceId),
      type: "active"
    });
    expect(invalidateWorkspaceQueries).toHaveBeenCalledWith(workspaceId, TIMELOG_MUTATION_SCOPES);
    expect(invalidateWorkspaceData).toHaveBeenCalledWith(workspaceId, TIMELOG_MUTATION_SCOPES);
  });
});
