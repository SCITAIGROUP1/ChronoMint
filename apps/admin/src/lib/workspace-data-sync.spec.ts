/** @vitest-environment jsdom */
/* eslint-disable import/order -- vitest mocks must precede subject import */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const workspaceId = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  refreshWorkspace: vi.fn(),
  triggerApprovalsRefresh: vi.fn(),
  triggerTimelogRefresh: vi.fn(),
  clearInflightGetRequestsForPath: vi.fn()
}));

vi.mock("@/lib/approvals-refresh-registry", () => ({
  triggerApprovalsRefresh: mocks.triggerApprovalsRefresh
}));

vi.mock("@/lib/timelog-refresh-registry", () => ({
  triggerTimelogRefresh: mocks.triggerTimelogRefresh
}));

vi.mock("@kloqra/web-shared", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    clearInflightGetRequestsForPath: mocks.clearInflightGetRequestsForPath
  };
});

vi.mock("@/stores/pending-timesheets.store", () => ({
  usePendingTimesheetsStore: {
    getState: () => ({ refreshWorkspace: mocks.refreshWorkspace })
  }
}));

import { useAdminWorkspaceDataSync } from "./workspace-data-sync";

describe("useAdminWorkspaceDataSync", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes pending approvals when that scope is stale", async () => {
    const { WORKSPACE_DATA_STALE_EVENT } = await import("@kloqra/web-shared");

    renderHook(() => useAdminWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["pending_approvals"] }
      })
    );

    expect(mocks.refreshWorkspace).toHaveBeenCalledWith(workspaceId);
    expect(mocks.triggerApprovalsRefresh).toHaveBeenCalled();
  });

  it("ignores stale events for other workspaces", async () => {
    const { WORKSPACE_DATA_STALE_EVENT } = await import("@kloqra/web-shared");

    renderHook(() => useAdminWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId: "other-ws", scopes: ["pending_approvals"] }
      })
    );

    expect(mocks.refreshWorkspace).not.toHaveBeenCalled();
    expect(mocks.triggerApprovalsRefresh).not.toHaveBeenCalled();
  });

  it("refreshes timelog-backed views when timelog scopes are stale", async () => {
    const { WORKSPACE_DATA_STALE_EVENT } = await import("@kloqra/web-shared");

    renderHook(() => useAdminWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["timelogs"] }
      })
    );

    expect(mocks.clearInflightGetRequestsForPath).toHaveBeenCalledWith("/timelogs");
    expect(mocks.triggerTimelogRefresh).toHaveBeenCalled();
  });
});
