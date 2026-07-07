import { ROUTES } from "@kloqra/contracts";
import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ProjectsService } from "../../application/projects.service";

@Controller()
export class TeamInvitesController {
  constructor(private projects: ProjectsService) {}

  @Get(ROUTES.TEAM_INVITES.PREVIEW(":token"))
  preview(@Param("token") token: string) {
    return this.projects.previewInvite(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post(ROUTES.TEAM_INVITES.ACCEPT(":token"))
  accept(@Param("token") token: string, @WorkspaceUser() user: WorkspaceRequestUser) {
    return this.projects.acceptInviteForUser(token, user.userId);
  }
}
