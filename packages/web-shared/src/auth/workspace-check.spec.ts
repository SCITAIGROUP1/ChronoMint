import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspacesStore } from "../stores/workspaces.store";
import { hasMultipleWorkspaces } from "./workspace-check";

const { apiMock } = vi.hoisted(() => ({
  apiMock: vi.fn()
}));

vi.mock("../api/client", () => ({
  api: (...args: unknown[]) => apiMock(...args)
}));

describe("hasMultipleWorkspaces", () => {
  beforeEach(() => {
    apiMock.mockReset();
    useWorkspacesStore.getState().clear();
  });

  it("seeds the workspaces store from the list response", async () => {
    const list = [
      { id: "ws-1", name: "Alpha", role: "MEMBER" as const },
      { id: "ws-2", name: "Beta", role: "MEMBER" as const }
    ];
    apiMock.mockResolvedValue(list);

    await expect(hasMultipleWorkspaces("ws-1")).resolves.toBe(true);
    expect(useWorkspacesStore.getState().workspaces).toEqual(list);
  });

  it("returns false for a single workspace and still seeds the store", async () => {
    const list = [{ id: "ws-1", name: "Alpha", role: "MEMBER" as const }];
    apiMock.mockResolvedValue(list);

    await expect(hasMultipleWorkspaces("ws-1")).resolves.toBe(false);
    expect(useWorkspacesStore.getState().workspaces).toEqual(list);
  });
});
