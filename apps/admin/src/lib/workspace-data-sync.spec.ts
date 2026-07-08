/** @vitest-environment jsdom */
/* eslint-disable import/order -- vitest mocks must precede subject import */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const workspaceId = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  triggerApprovalsRefresh: vi.fn(),
  triggerTimelogRefresh: vi.fn(),
  invalidateWorkspaceQueries: vi.fn().mockResolvedValue(undefined)
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
    ...(actual as Record<string, unknown>),
    invalidateWorkspaceQueries: mocks.invalidateWorkspaceQueries
  };
});

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

    expect(mocks.triggerTimelogRefresh).toHaveBeenCalled();
  });

  it("refreshes catalog-backed views when projects or tasks scopes are stale", async () => {
    const { WORKSPACE_DATA_STALE_EVENT } = await import("@kloqra/web-shared");

    renderHook(() => useAdminWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["projects"] }
      })
    );

    expect(mocks.triggerTimelogRefresh).toHaveBeenCalled();
  });
});
