type StorageAdapter = Pick<Storage, "removeItem">;

const OBSOLETE_SESSION_KEYS = [
  "cm-admin-access-token",
  "cm-client-access-token",
  "cm-access-token",
  "cm-admin-refresh-token",
  "cm-client-refresh-token",
  "cm-refresh-token",
  "cm-admin-workspace-id",
  "cm-client-workspace-id",
  "cm-workspace-id"
] as const;

export function clearObsoleteSessionStorage(storage: StorageAdapter): void {
  for (const key of OBSOLETE_SESSION_KEYS) {
    storage.removeItem(key);
  }
}
