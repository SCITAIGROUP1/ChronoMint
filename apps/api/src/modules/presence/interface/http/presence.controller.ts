import { ROUTES } from "@kloqra/contracts";
import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { type Response, type Request } from "express";
import { AuthorizationEnforcementService } from "../../../../common/access/authorization-enforcement.service";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { PresenceService } from "../../application/presence.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PresenceController {
  constructor(
    private presence: PresenceService,
    private authorization: AuthorizationEnforcementService
  ) {}

  private async scope(user: WorkspaceRequestUser) {
    const workspace = await this.authorization.evaluate({
      principalId: user.userId,
      permission: "workspace:ReadPresence",
      resource: { scope: "workspace", workspaceId: user.workspaceId }
    });
    if (workspace.allowed) return { role: "ADMIN" as const, projectIds: undefined };

    const decisions = await Promise.all(
      (user.managedProjectIds ?? []).map(async (projectId) => ({
        projectId,
        decision: await this.authorization.evaluate({
          principalId: user.userId,
          permission: "project:ReadPresence",
          resource: { scope: "project", projectId, expectedWorkspaceId: user.workspaceId }
        })
      }))
    );
    const projectIds = decisions
      .filter(({ decision }) => decision.allowed)
      .map(({ projectId }) => projectId);
    if (projectIds.length === 0) {
      await this.authorization.assertAllowed({
        principalId: user.userId,
        permission: "workspace:ReadPresence",
        resource: { scope: "workspace", workspaceId: user.workspaceId }
      });
    }
    return { role: "MEMBER" as const, projectIds };
  }

  @Get(ROUTES.PRESENCE.SNAPSHOT)
  async snapshot(@WorkspaceUser() user: WorkspaceRequestUser) {
    const scope = await this.scope(user);
    return this.presence.snapshot(user.workspaceId, user.userId, scope.role, scope.projectIds);
  }

  @Get(ROUTES.PRESENCE.STREAM)
  async stream(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const scope = await this.scope(user);
    return this.presence.streamSse(
      user.workspaceId,
      req,
      res,
      user.userId,
      scope.role,
      scope.projectIds
    );
  }
}
