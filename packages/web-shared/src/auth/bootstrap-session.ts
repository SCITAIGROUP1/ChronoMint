import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto, WorkspaceWithRoleDto } from "@kloqra/contracts";
import { getApiBase } from "../api/base";
import { api } from "../api/client";
import { getAccessToken, useSessionStore } from "../stores/session.store";
import { applyDefaultWorkspaceIfNeeded } from "./apply-default-workspace";
import { isAccessTokenExpired } from "./jwt-payload";
import { tryRefreshSession } from "./refresh-session";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

export type BootstrapResult =
  | { ok: true; session: AuthSessionDto; workspaces: WorkspaceWithRoleDto[] }
  | { ok: false };

export type BootstrapOptions = {
  /** Clear local session before refresh (legacy impersonation handoff). */
  clearBeforeRefresh?: boolean;
  /** One-time impersonation token from admin redirect (production cross-site handoff). */
  handoffToken?: string;
  /** Require workspace role after bootstrap. */
  requiredRole?: "ADMIN" | "MEMBER";
};

async function completeImpersonationHandoff(handoffToken: string): Promise<string | null> {
  const res = await fetch(`${getApiBase()}${ROUTES.AUTH.IMPERSONATE_COMPLETE}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Scope": AUTH_SCOPE
    },
    body: JSON.stringify({ handoffToken })
  });
  if (!res.ok) return null;
  const body = (await res.json()) as AuthSessionDto & { accessToken?: string };
  if (!body.accessToken) return null;
  useSessionStore.getState().setSession(body, body.accessToken);
  return body.accessToken;
}

/**
 * Restore session from refresh cookie and/or access token, then load workspaces.
 */
export async function bootstrapSession(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  if (options.clearBeforeRefresh || options.handoffToken) {
    useSessionStore.getState().clear();
  }

  let token: string | null = null;
  if (options.handoffToken) {
    token = await completeImpersonationHandoff(options.handoffToken);
    if (!token) return { ok: false };
  } else {
    token = getAccessToken();
    if (!token || isAccessTokenExpired(token) || options.clearBeforeRefresh) {
      token = await tryRefreshSession();
      if (!token) return { ok: false };
    }
  }

  try {
    let session = await api<AuthSessionDto>(ROUTES.AUTH.ME);
    if (options.requiredRole && session.workspaceRole !== options.requiredRole) {
      return { ok: false };
    }

    const switched = await applyDefaultWorkspaceIfNeeded(session, token);
    session = switched.session;
    token = switched.accessToken;

    if (options.requiredRole && session.workspaceRole !== options.requiredRole) {
      return { ok: false };
    }

    useSessionStore.getState().setSession(session, token);

    const workspaces = await api<WorkspaceWithRoleDto[]>(ROUTES.WORKSPACES.LIST, {
      workspaceId: session.workspaceId
    });

    return { ok: true, session, workspaces };
  } catch {
    return { ok: false };
  }
}
