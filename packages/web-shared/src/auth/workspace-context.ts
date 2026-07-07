import { getAccessToken, syncWorkspaceIdToStorage, useSessionStore } from "../stores/session.store";
import { readWorkspaceIdFromToken } from "./jwt-payload";

/**
 * Active workspace for UI — JWT claim wins; session state when token has no workspace.
 */
export function getEffectiveWorkspaceId(): string | null {
  const fromToken = readWorkspaceIdFromToken(getAccessToken());
  if (fromToken) return fromToken;
  return useSessionStore.getState().session?.workspaceId ?? null;
}

/**
 * Workspace for API headers — JWT claim always wins over stale React state.
 * Never falls back to localStorage when the token has no workspace (tenant onboarding).
 */
export function resolveApiWorkspaceId(explicit?: string | null): string | null {
  const fromToken = readWorkspaceIdFromToken(getAccessToken());
  if (fromToken) {
    if (explicit && explicit !== fromToken) {
      syncWorkspaceIdToStorage(fromToken);
    }
    return fromToken;
  }
  return explicit?.trim() || null;
}

export function isWorkspaceMismatchError(message: string): boolean {
  return message.toLowerCase().includes("workspace context mismatch");
}
