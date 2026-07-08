import { readUserIdFromToken, readWorkspaceIdFromToken } from "../auth/jwt-payload";

/** True when UI workspace + session + JWT agree — safe to fire workspace-scoped queries. */
export function isWorkspaceQuerySessionReady(input: {
  enabled: boolean;
  workspaceId: string;
  sessionUserId?: string | null;
  sessionWorkspaceId?: string | null;
  accessToken: string | null;
}): boolean {
  const tokenUserId = readUserIdFromToken(input.accessToken);
  const tokenWorkspaceId = readWorkspaceIdFromToken(input.accessToken);
  return Boolean(
    input.enabled &&
    input.workspaceId &&
    input.sessionUserId &&
    tokenUserId &&
    input.sessionUserId === tokenUserId &&
    input.sessionWorkspaceId &&
    tokenWorkspaceId &&
    input.workspaceId === input.sessionWorkspaceId &&
    input.workspaceId === tokenWorkspaceId
  );
}
