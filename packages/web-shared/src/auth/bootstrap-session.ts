import { ROUTES } from "@kloqra/contracts";
import type { AuthSessionDto, WorkspaceWithRoleDto } from "@kloqra/contracts";
import { api } from "../api/client";
import { getAccessToken, useSessionStore } from "../stores/session.store";
import { applyDefaultWorkspaceIfNeeded } from "./apply-default-workspace";
import { isAccessTokenExpired } from "./jwt-payload";
import { tryRefreshSession } from "./refresh-session";

export type BootstrapResult =
  | { ok: true; session: AuthSessionDto; workspaces: WorkspaceWithRoleDto[] }
  | { ok: false };

export type BootstrapOptions = {
  /** Clear local session before refresh (impersonation handoff). */
  clearBeforeRefresh?: boolean;
  /** Require workspace role after bootstrap. */
  requiredRole?: "ADMIN" | "MEMBER";
};

/**
 * Restore session from refresh cookie and/or access token, then load workspaces.
 */
export async function bootstrapSession(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  if (options.clearBeforeRefresh) {
    useSessionStore.getState().clear();
  }

  let token = getAccessToken();
  if (!token || isAccessTokenExpired(token) || options.clearBeforeRefresh) {
    token = await tryRefreshSession();
    if (!token) return { ok: false };
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
