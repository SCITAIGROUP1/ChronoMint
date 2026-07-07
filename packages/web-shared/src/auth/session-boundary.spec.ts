import { describe, expect, it, vi, beforeEach } from "vitest";
import { useUserProfileStore } from "../stores/user-profile.store";
import { applySessionBoundary, getSessionGeneration } from "./session-boundary";

describe("session-boundary", () => {
  beforeEach(() => {
    useUserProfileStore.getState().clear();
    vi.resetModules();
  });

  it("increments session generation on full boundary", () => {
    const before = getSessionGeneration();
    applySessionBoundary({
      prev: {
        user: { id: "user-1", name: "A" },
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        workspaceRole: "ADMIN"
      },
      next: null,
      reason: "logout",
      level: "full"
    });
    expect(getSessionGeneration()).toBe(before + 1);
  });

  it("clears profile store on full boundary", () => {
    useUserProfileStore.getState().setProfile("ws-1", {
      id: "user-1",
      email: "a@example.com",
      name: "A"
    } as never);
    applySessionBoundary({
      prev: {
        user: { id: "user-1", name: "A" },
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        workspaceRole: "ADMIN"
      },
      next: null,
      reason: "logout",
      level: "full"
    });
    expect(useUserProfileStore.getState().byWorkspace).toEqual({});
  });
});
