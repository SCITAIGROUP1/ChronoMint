import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspacesStore } from "./workspaces.store";

describe("useWorkspacesStore", () => {
  beforeEach(() => {
    useWorkspacesStore.getState().clear();
  });

  it("coalesces concurrent ensureLoaded calls into one fetch", async () => {
    let resolve!: (value: Array<{ id: string; name: string; role: "MEMBER" }>) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<Array<{ id: string; name: string; role: "MEMBER" }>>((r) => {
          resolve = r;
        })
    );

    const p1 = useWorkspacesStore.getState().ensureLoaded(fetcher);
    const p2 = useWorkspacesStore.getState().ensureLoaded(fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    resolve([{ id: "ws-1", name: "Alpha", role: "MEMBER" }]);
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toEqual(b);
    expect(useWorkspacesStore.getState().workspaces).toHaveLength(1);
  });

  it("skips fetch when already seeded", async () => {
    useWorkspacesStore.getState().setWorkspaces([{ id: "ws-1", name: "Alpha", role: "MEMBER" }]);
    const fetcher = vi.fn();
    await useWorkspacesStore.getState().ensureLoaded(fetcher);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
