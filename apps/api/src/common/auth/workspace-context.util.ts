import { ErrorCodes } from "@kloqra/contracts";
import { UnauthorizedException } from "@nestjs/common";
import type { RequestUser } from "../decorators/current-user.decorator";

export type WorkspaceRequestUser = RequestUser & {
  workspaceId: string;
  role: "ADMIN" | "MEMBER";
};

/** Narrow request user after JwtAuthGuard workspace enforcement. */
export function requireWorkspaceUser(user: RequestUser): WorkspaceRequestUser {
  if (!user.workspaceId || !user.role) {
    throw new UnauthorizedException({
      code: ErrorCodes.WORKSPACE_REQUIRED,
      message: "Workspace required"
    });
  }
  return user as WorkspaceRequestUser;
}
