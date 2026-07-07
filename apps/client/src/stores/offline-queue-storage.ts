import type { OfflineLog } from "./offline-store";

const LEGACY_LOGS_KEY = "kloqra_offline_logs";
const LEGACY_DELETIONS_KEY = "kloqra_offline_deletions";

export type OfflineQueueScope = {
  authScope: string;
  userId: string;
  tenantId: string;
  workspaceId: string | null;
};

function scopeSegment(scope: OfflineQueueScope): string {
  return scope.workspaceId ?? `tenant:${scope.tenantId}`;
}

export function offlineLogsKey(scope: OfflineQueueScope): string {
  return `kloqra:offline:logs:${scope.authScope}:${scope.userId}:${scopeSegment(scope)}`;
}

export function offlineDeletionsKey(scope: OfflineQueueScope): string {
  return `kloqra:offline:deletions:${scope.authScope}:${scope.userId}:${scopeSegment(scope)}`;
}

export function readOfflineLogs(scope: OfflineQueueScope | null): OfflineLog[] {
  if (typeof window === "undefined") return [];
  if (!scope) return [];
  try {
    const raw = localStorage.getItem(offlineLogsKey(scope));
    return raw ? (JSON.parse(raw) as OfflineLog[]) : [];
  } catch {
    return [];
  }
}

export function readOfflineDeletions(scope: OfflineQueueScope | null): string[] {
  if (typeof window === "undefined") return [];
  if (!scope) return [];
  try {
    const raw = localStorage.getItem(offlineDeletionsKey(scope));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function writeOfflineLogs(scope: OfflineQueueScope, logs: OfflineLog[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(offlineLogsKey(scope), JSON.stringify(logs));
}

export function writeOfflineDeletions(scope: OfflineQueueScope, ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(offlineDeletionsKey(scope), JSON.stringify(ids));
}

export function clearOfflineQueueStorage(scope: OfflineQueueScope | null): void {
  if (typeof window === "undefined" || !scope) return;
  localStorage.removeItem(offlineLogsKey(scope));
  localStorage.removeItem(offlineDeletionsKey(scope));
}

export function clearLegacyOfflineQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_LOGS_KEY);
  localStorage.removeItem(LEGACY_DELETIONS_KEY);
}

export function resolveOfflineQueueScope(
  session: {
    user: { id: string };
    tenantId: string;
    workspaceId?: string;
  } | null
): OfflineQueueScope | null {
  if (!session?.user?.id || !session.tenantId) return null;
  const authScope = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";
  return {
    authScope,
    userId: session.user.id,
    tenantId: session.tenantId,
    workspaceId: session.workspaceId ?? null
  };
}
