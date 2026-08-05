import type { AuthSessionDto } from "@kloqra/contracts";
import { create } from "zustand";
import {
  broadcastSessionCleared,
  broadcastSessionUpdate,
  subscribeSessionUpdates
} from "../auth/auth-channel";
import { invalidateAuthRefresh } from "../auth/auth-refresh-guard";
import { readWorkspaceIdFromToken } from "../auth/jwt-payload";
import { clearObsoleteSessionStorage } from "../auth/obsolete-session-storage";
import {
  applySessionBoundary,
  resolveColdHydrationBoundaryLevel,
  type SessionBoundaryReason
} from "../auth/session-boundary";
import type { SessionBoundaryLevel } from "../auth/session-identity";
import { cancelProactiveRefresh, scheduleProactiveRefresh } from "../auth/token-scheduler";

function tokenKey() {
  return "cm-app-access-token";
}

function refreshTokenKey() {
  return "cm-app-refresh-token";
}

function workspaceKey() {
  return "cm-app-workspace-id";
}

function clearObsoleteStorage() {
  clearObsoleteSessionStorage(localStorage);
}

function persistSessionTokens(
  session: AuthSessionDto,
  accessToken: string,
  refreshToken?: string
): void {
  if (typeof window === "undefined") return;
  clearObsoleteStorage();
  localStorage.setItem(tokenKey(), accessToken);
  if (session.workspaceId) {
    localStorage.setItem(workspaceKey(), session.workspaceId);
  } else {
    localStorage.removeItem(workspaceKey());
  }
  if (refreshToken) {
    localStorage.setItem(refreshTokenKey(), refreshToken);
  }
}

function clearPersistedTokens(): void {
  if (typeof window === "undefined") return;
  cancelProactiveRefresh();
  localStorage.removeItem(tokenKey());
  localStorage.removeItem(refreshTokenKey());
  localStorage.removeItem(workspaceKey());
  clearObsoleteStorage();
}

interface SessionState {
  session: AuthSessionDto | null;
  accessToken: string | null;
  setSession: (
    session: AuthSessionDto,
    accessToken: string,
    refreshToken?: string,
    options?: { boundaryReason?: SessionBoundaryReason; level?: SessionBoundaryLevel }
  ) => void;
  clear: (options?: { boundaryReason?: SessionBoundaryReason }) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  accessToken: null,
  setSession: (session, accessToken, refreshToken, options) => {
    const prev = get().session;
    const reason = options?.boundaryReason ?? "session_update";
    let level = options?.level;
    if (level === undefined && !prev && reason === "session_update") {
      level = resolveColdHydrationBoundaryLevel(session, accessToken);
    }
    applySessionBoundary({
      prev,
      next: session,
      reason,
      level
    });
    persistSessionTokens(session, accessToken, refreshToken);
    if (typeof window !== "undefined") {
      broadcastSessionUpdate(session, accessToken);
      scheduleProactiveRefresh(accessToken);
    }
    set({ session, accessToken });
  },
  clear: (options) => {
    const prev = get().session;
    invalidateAuthRefresh();
    applySessionBoundary({
      prev,
      next: null,
      reason: options?.boundaryReason ?? "logout",
      level: "full"
    });
    clearPersistedTokens();
    if (typeof window !== "undefined") {
      void import("../realtime/notification-socket-manager").then((m) =>
        m.forceDisconnectNotificationSocket()
      );
    }
    if (typeof window !== "undefined" && !applyingPeerSessionClear) {
      broadcastSessionCleared();
    }
    set({ session: null, accessToken: null });
  }
}));

export function getWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  const fromToken = readWorkspaceIdFromToken(getAccessToken());
  if (fromToken) return fromToken;
  return useSessionStore.getState().session?.workspaceId ?? null;
}

/** Align localStorage workspace with JWT after login or when another tab switched workspace. */
export function syncWorkspaceIdToStorage(workspaceId: string): void {
  if (typeof window === "undefined") return;
  clearObsoleteStorage();
  localStorage.setItem(workspaceKey(), workspaceId);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  clearObsoleteStorage();
  return localStorage.getItem(tokenKey());
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  clearObsoleteStorage();
  return localStorage.getItem(refreshTokenKey());
}

/** Sync session from other tabs without re-broadcasting. */
export function applySessionFromPeer(session: AuthSessionDto, accessToken: string): void {
  const prev = useSessionStore.getState().session;
  applySessionBoundary({ prev, next: session, reason: "peer_sync" });
  persistSessionTokens(session, accessToken);
  if (typeof window !== "undefined") {
    scheduleProactiveRefresh(accessToken);
  }
  useSessionStore.setState({ session, accessToken });
}

let applyingPeerSessionClear = false;

function clearSessionFromPeer(): void {
  if (getAccessToken()) {
    void import("../auth/session-token-reconcile").then((m) => m.syncSessionFromStoredToken());
    return;
  }
  applyingPeerSessionClear = true;
  useSessionStore.getState().clear({ boundaryReason: "peer_sync" });
  applyingPeerSessionClear = false;
}

if (typeof window !== "undefined") {
  queueMicrotask(() => {
    subscribeSessionUpdates(
      (session, accessToken) => {
        applySessionFromPeer(session, accessToken);
      },
      () => {
        clearSessionFromPeer();
      }
    );
  });
}
