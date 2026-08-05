import type { TimeEntryDraft } from "./time-entry-draft";

const STORAGE_PREFIX = "kloqra.time-entry-draft";

export function timeEntryDraftStorageKey(
  workspaceId: string,
  editingLogId?: string | null
): string {
  const scope = editingLogId ? `edit:${editingLogId}` : "create";
  return `${STORAGE_PREFIX}:${workspaceId}:${scope}`;
}

export function serializeTimeEntryDraft(draft: TimeEntryDraft): string {
  return JSON.stringify(draft);
}

export function readTimeEntryDraftStorage(key: string): TimeEntryDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TimeEntryDraft;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.date !== "string" || typeof parsed.startTime !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTimeEntryDraftStorage(key: string, draft: TimeEntryDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, serializeTimeEntryDraft(draft));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function clearTimeEntryDraftStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export function clearTimeEntryDraftStorageFor(
  workspaceId: string,
  editingLogId?: string | null
): void {
  clearTimeEntryDraftStorage(timeEntryDraftStorageKey(workspaceId, editingLogId));
}
