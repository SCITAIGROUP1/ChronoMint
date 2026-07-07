import type { AuthSessionDto } from "@kloqra/contracts";

const AUTH_SCOPE = process.env.NEXT_PUBLIC_AUTH_SCOPE?.trim() || "app";

export type SessionIdentity = {
  userId: string;
  tenantId: string;
  workspaceId: string | null;
  requiresWorkspaceSetup: boolean;
  impersonatorId: string | null;
  authScope: string;
};

export type SessionBoundaryLevel = "none" | "workspace" | "full";

export function getSessionIdentity(
  session: AuthSessionDto | null | undefined
): SessionIdentity | null {
  if (!session?.user?.id || !session.tenantId) return null;
  return {
    userId: session.user.id,
    tenantId: session.tenantId,
    workspaceId: session.workspaceId ?? null,
    requiresWorkspaceSetup: session.requiresWorkspaceSetup === true,
    impersonatorId: session.impersonatorId ?? null,
    authScope: AUTH_SCOPE
  };
}

export function compareSessionIdentity(
  prev: SessionIdentity | null,
  next: SessionIdentity | null
): SessionBoundaryLevel {
  if (!next) return "full";
  if (!prev) return "full";
  if (prev.userId !== next.userId) return "full";
  if (prev.impersonatorId !== next.impersonatorId) return "full";
  if (prev.tenantId !== next.tenantId) return "full";
  if (prev.workspaceId !== next.workspaceId) return "workspace";
  if (prev.requiresWorkspaceSetup !== next.requiresWorkspaceSetup) return "workspace";
  return "none";
}
