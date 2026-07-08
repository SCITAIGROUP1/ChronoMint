/** @vitest-environment jsdom */
/* eslint-disable import/order -- vitest mocks must precede subject import */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const workspaceId = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  invalidateActive: vi.fn()
}));

vi.mock("@/stores/active-timer-session.store", () => ({
  useActiveTimerSessionStore: {
    getState: () => ({ invalidateActive: mocks.invalidateActive })
  }
}));

import { useClientWorkspaceDataSync } from "./workspace-data-sync";

describe("useClientWorkspaceDataSync", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates active timer session when timelogs scope is stale", async () => {
    const { WORKSPACE_DATA_STALE_EVENT } = await import("@kloqra/web-shared");

    renderHook(() => useClientWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId, scopes: ["timelogs"] }
      })
    );

    expect(mocks.invalidateActive).toHaveBeenCalledWith(workspaceId);
  });

  it("ignores stale events for other workspaces", async () => {
    const { WORKSPACE_DATA_STALE_EVENT } = await import("@kloqra/web-shared");

    renderHook(() => useClientWorkspaceDataSync(workspaceId));
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_DATA_STALE_EVENT, {
        detail: { workspaceId: "other-ws", scopes: ["submissions"] }
      })
    );

    expect(mocks.invalidateActive).not.toHaveBeenCalled();
  });
});
