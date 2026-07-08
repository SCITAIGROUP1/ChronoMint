import { afterEach, describe, expect, it } from "vitest";
import { clearLegacyOfflineStorage } from "./service-worker-cleanup";

describe("clearLegacyOfflineStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("removes legacy and scoped offline queue keys", () => {
    localStorage.setItem("kloqra_offline_logs", "[]");
    localStorage.setItem("kloqra_offline_deletions", "[]");
    localStorage.setItem("kloqra:offline:logs:client:user-1:ws-1", "[]");
    localStorage.setItem("kloqra:other:key", "keep");

    clearLegacyOfflineStorage();

    expect(localStorage.getItem("kloqra_offline_logs")).toBeNull();
    expect(localStorage.getItem("kloqra_offline_deletions")).toBeNull();
    expect(localStorage.getItem("kloqra:offline:logs:client:user-1:ws-1")).toBeNull();
    expect(localStorage.getItem("kloqra:other:key")).toBe("keep");
  });
});
