const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

export type ScopedStorageIdentity = {
  userId: string;
  authScope?: string;
  workspaceId?: string | null;
  tenantId?: string;
};

export function scopedStorageKey(
  base: string,
  identity: ScopedStorageIdentity,
  workspaceScoped = false
): string {
  const scope = identity.authScope ?? AUTH_SCOPE;
  if (workspaceScoped && identity.workspaceId) {
    return `kloqra:${scope}:${identity.userId}:${identity.workspaceId}:${base}`;
  }
  return `kloqra:${scope}:${identity.userId}:${base}`;
}

export function readScopedJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeScopedJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeScopedKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

/** Read from scoped key, falling back to a legacy global key once (then migrate). */
export function readScopedWithLegacyMigration<T>(
  scopedKey: string,
  legacyKey: string,
  migrate: (value: T) => void
): T | null {
  const scoped = readScopedJSON<T>(scopedKey);
  if (scoped != null) return scoped;
  const legacy = readScopedJSON<T>(legacyKey);
  if (legacy == null) return null;
  writeScopedJSON(scopedKey, legacy);
  localStorage.removeItem(legacyKey);
  migrate(legacy);
  return legacy;
}
