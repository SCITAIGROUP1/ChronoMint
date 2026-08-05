import type { AuthScope } from "@kloqra/contracts";
import { configuredAuthScope } from "../auth/configured-auth-scope";

const AUTH_SCOPE = configuredAuthScope(process.env.NEXT_PUBLIC_AUTH_SCOPE, "app");

export type ScopedStorageIdentity = {
  userId: string;
  authScope?: AuthScope;
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
