import { readScopedJSON, scopedStorageKey, writeScopedJSON } from "@kloqra/web-shared";

export const LEGACY_APPROVALS_VIEW_MODE_KEY = "kloqra_admin_approvals_view_mode";

export type ApprovalsViewMode = "card" | "table";

export function readApprovalsViewMode(userId: string): ApprovalsViewMode | null {
  const key = scopedStorageKey("approvals_view_mode", { userId });
  const legacy = localStorage.getItem(LEGACY_APPROVALS_VIEW_MODE_KEY);
  if ((legacy === "card" || legacy === "table") && !localStorage.getItem(key)) {
    writeScopedJSON(key, legacy);
    localStorage.removeItem(LEGACY_APPROVALS_VIEW_MODE_KEY);
    return legacy;
  }
  const saved = readScopedJSON<ApprovalsViewMode>(key);
  return saved === "card" || saved === "table" ? saved : null;
}

export function writeApprovalsViewMode(userId: string, mode: ApprovalsViewMode): void {
  writeScopedJSON(scopedStorageKey("approvals_view_mode", { userId }), mode);
  localStorage.removeItem(LEGACY_APPROVALS_VIEW_MODE_KEY);
}
