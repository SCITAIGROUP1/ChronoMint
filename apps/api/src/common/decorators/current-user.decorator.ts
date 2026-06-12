import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { WorkspaceRole } from "@kloqra/contracts";

export interface RequestUser {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  impersonatorId?: string;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  }
);
