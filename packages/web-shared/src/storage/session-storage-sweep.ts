import type { SessionIdentity } from "../auth/session-identity";

const LEGACY_GLOBAL_STORAGE_KEYS = [
  "kloqra_favorites",
  "kloqra_offline_logs",
  "kloqra_offline_deletions",
  "kloqra_onboarding_done",
  "kloqra_onboarding_tour_done",
  "kloqra-show-occupancy-overlay",
  "kloqra_admin_approvals_view_mode",
  "kloqra-timesheet-mobile-banner-dismissed",
  "kloqra-timesheet-mobile-view-init",
  "kloqra-assistant-turns-v1",
  "kloqra-assistant-feedback-v1"
] as const;

function removeKeysWithPrefix(storage: Storage, prefix: string): void {
  for (let i = storage.length - 1; i >= 0; i -= 1) {
    const key = storage.key(i);
    if (key?.startsWith(prefix)) {
      storage.removeItem(key);
    }
  }
}

/** Remove browser keys owned by the previous signed-in user on a full session boundary. */
export function clearSessionScopedBrowserStorage(prev: SessionIdentity | null): void {
  if (typeof window === "undefined" || !prev) return;

  const userPrefix = `kloqra:${prev.authScope}:${prev.userId}:`;
  const offlinePrefix = `kloqra:offline:`;

  removeKeysWithPrefix(localStorage, userPrefix);
  removeKeysWithPrefix(sessionStorage, userPrefix);

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(offlinePrefix)) continue;
    if (key.includes(`:${prev.userId}:`)) {
      localStorage.removeItem(key);
    }
  }

  for (const legacyKey of LEGACY_GLOBAL_STORAGE_KEYS) {
    localStorage.removeItem(legacyKey);
    sessionStorage.removeItem(legacyKey);
  }
}
