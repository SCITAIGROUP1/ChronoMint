/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { clearSessionScopedBrowserStorage } from "./session-storage-sweep";

describe("clearSessionScopedBrowserStorage", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("removes scoped keys for the previous user", () => {
    localStorage.setItem("kloqra:client:user-a:favorites", "[]");
    localStorage.setItem("kloqra:client:user-b:favorites", "[]");
    sessionStorage.setItem("kloqra:client:user-a:assistant_turns", "[]");
    localStorage.setItem("kloqra_favorites", "legacy");

    clearSessionScopedBrowserStorage({
      userId: "user-a",
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      requiresWorkspaceSetup: false,
      impersonatorId: null,
      authScope: "client"
    });

    expect(localStorage.getItem("kloqra:client:user-a:favorites")).toBeNull();
    expect(localStorage.getItem("kloqra:client:user-b:favorites")).toBe("[]");
    expect(sessionStorage.getItem("kloqra:client:user-a:assistant_turns")).toBeNull();
    expect(localStorage.getItem("kloqra_favorites")).toBeNull();
  });
});
