import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { requireWorkspaceUser, type WorkspaceRequestUser } from "../auth/workspace-context.util";

export type { WorkspaceRequestUser };

/** Authenticated user with a validated workspace context (post JwtAuthGuard). */
export const WorkspaceUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): WorkspaceRequestUser => {
    return requireWorkspaceUser(ctx.switchToHttp().getRequest().user);
  }
);
