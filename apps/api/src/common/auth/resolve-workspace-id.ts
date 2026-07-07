import { ErrorCodes } from "@kloqra/contracts";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

/** Prefer JWT workspace; reject stale X-Workspace-Id from another device/tab. */
export function resolveWorkspaceId(
  tokenWorkspaceId: string | undefined,
  headerWorkspaceId: string | undefined
): string | undefined {
  const header = headerWorkspaceId?.trim();
  const token = tokenWorkspaceId?.trim();

  if (header && token && header !== token) {
    throw new ForbiddenException({
      code: ErrorCodes.FORBIDDEN,
      message: "Workspace context mismatch. Sign in again or switch workspace on this device."
    });
  }

  return token ?? header ?? undefined;
}

/** Require workspace context for workspace-scoped routes. */
export function requireWorkspaceId(
  tokenWorkspaceId: string | undefined,
  headerWorkspaceId: string | undefined
): string {
  const resolved = resolveWorkspaceId(tokenWorkspaceId, headerWorkspaceId);
  if (!resolved) {
    throw new UnauthorizedException({
      code: ErrorCodes.WORKSPACE_REQUIRED,
      message: "Workspace required"
    });
  }
  return resolved;
}
