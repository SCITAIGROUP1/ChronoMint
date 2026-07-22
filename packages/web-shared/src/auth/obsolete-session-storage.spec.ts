import { describe, expect, it } from "vitest";
import { clearObsoleteSessionStorage } from "./obsolete-session-storage";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
}

describe("clearObsoleteSessionStorage", () => {
  it("removes obsolete session keys without adopting their values", () => {
    const storage = createStorage();
    storage.setItem("cm-admin-access-token", "admin-access");
    storage.setItem("cm-client-refresh-token", "client-refresh");
    storage.setItem("cm-workspace-id", "workspace");

    clearObsoleteSessionStorage(storage);

    expect(storage.getItem("cm-admin-access-token")).toBeNull();
    expect(storage.getItem("cm-client-refresh-token")).toBeNull();
    expect(storage.getItem("cm-workspace-id")).toBeNull();
    expect(storage.getItem("cm-app-access-token")).toBeNull();
    expect(storage.getItem("cm-app-refresh-token")).toBeNull();
    expect(storage.getItem("cm-app-workspace-id")).toBeNull();
  });

  it("preserves unified app session keys", () => {
    const storage = createStorage();
    storage.setItem("cm-app-access-token", "app-access");
    storage.setItem("cm-app-refresh-token", "app-refresh");
    storage.setItem("cm-app-workspace-id", "workspace");

    clearObsoleteSessionStorage(storage);

    expect(storage.getItem("cm-app-access-token")).toBe("app-access");
    expect(storage.getItem("cm-app-refresh-token")).toBe("app-refresh");
    expect(storage.getItem("cm-app-workspace-id")).toBe("workspace");
  });
});
