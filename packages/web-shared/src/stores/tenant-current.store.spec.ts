import { describe, expect, it, vi } from "vitest";
import { tenantCurrentCacheKey, useTenantCurrentStore } from "./tenant-current.store";

describe("useTenantCurrentStore", () => {
  it("coalesces concurrent loads for the same cache key", async () => {
    useTenantCurrentStore.getState().clear();
    let resolve!: (value: { id: string; name: string }) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<{ id: string; name: string }>((r) => {
          resolve = r;
        })
    );

    const key = tenantCurrentCacheKey("ws-1");
    const p1 = useTenantCurrentStore.getState().load(key, fetcher as never);
    const p2 = useTenantCurrentStore.getState().load(key, fetcher as never);

    expect(fetcher).toHaveBeenCalledTimes(1);
    resolve({ id: "t1", name: "Acme" });
    await expect(Promise.all([p1, p2])).resolves.toEqual([
      { id: "t1", name: "Acme" },
      { id: "t1", name: "Acme" }
    ]);
  });

  it("returns cached tenant without refetching", async () => {
    useTenantCurrentStore.getState().clear();
    const key = tenantCurrentCacheKey(null);
    const fetcher = vi.fn().mockResolvedValue({ id: "t1", name: "Acme" });

    await useTenantCurrentStore.getState().load(key, fetcher as never);
    await useTenantCurrentStore.getState().load(key, fetcher as never);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
