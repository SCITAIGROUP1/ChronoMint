import type { PlatformSessionDto } from "@kloqra/contracts";
import { create } from "zustand";
import { applySessionBoundary, type SessionBoundaryReason } from "../auth/session-boundary";
import { scheduleProactiveRefresh, cancelProactiveRefresh } from "../auth/token-scheduler";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "platform";

function tokenKey() {
  return `cm-${AUTH_SCOPE}-access-token`;
}

function refreshTokenKey() {
  return `cm-${AUTH_SCOPE}-refresh-token`;
}

function toBoundarySession(session: PlatformSessionDto | null) {
  if (!session) return null;
  return {
    user: session.user,
    tenantId: `platform:${session.user.id}`,
    workspaceId: null,
    tenantRole: "MEMBER" as const,
    workspaceRole: null
  };
}

interface PlatformSessionState {
  session: PlatformSessionDto | null;
  accessToken: string | null;
  setSession: (
    session: PlatformSessionDto,
    accessToken: string,
    refreshToken?: string,
    options?: { boundaryReason?: SessionBoundaryReason }
  ) => void;
  clear: (options?: { boundaryReason?: SessionBoundaryReason }) => void;
}

export const usePlatformSessionStore = create<PlatformSessionState>((set, get) => ({
  session: null,
  accessToken: null,
  setSession: (session, accessToken, refreshToken, options) => {
    const prev = get().session;
    applySessionBoundary({
      prev: toBoundarySession(prev),
      next: toBoundarySession(session),
      reason: options?.boundaryReason ?? "session_update"
    });
    if (typeof window !== "undefined") {
      localStorage.setItem(tokenKey(), accessToken);
      if (refreshToken) {
        localStorage.setItem(refreshTokenKey(), refreshToken);
      }
      scheduleProactiveRefresh(accessToken);
    }
    set({ session, accessToken });
  },
  clear: (options) => {
    const prev = get().session;
    applySessionBoundary({
      prev: toBoundarySession(prev),
      next: null,
      reason: options?.boundaryReason ?? "logout",
      level: "full"
    });
    if (typeof window !== "undefined") {
      cancelProactiveRefresh();
      localStorage.removeItem(tokenKey());
      localStorage.removeItem(refreshTokenKey());
    }
    set({ session: null, accessToken: null });
  }
}));

export function getPlatformAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(tokenKey());
}

export function getPlatformRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(refreshTokenKey());
}
