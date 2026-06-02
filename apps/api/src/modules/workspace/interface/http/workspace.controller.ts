import { Controller, Get, Param, Post, Body, UseGuards } from "@nestjs/common";
import { inviteMemberSchema, ROUTES } from "@chronomint/contracts";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { CurrentUser, RequestUser } from "../../../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { WorkspaceService } from "../../application/workspace.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkspaceController {
  constructor(private workspace: WorkspaceService) {}

  @Get(ROUTES.WORKSPACES.LIST)
  list(@CurrentUser() user: RequestUser) {
    return this.workspace.listForUser(user.userId);
  }

  @Get("/workspaces/:id/members")
  members(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    if (id !== user.workspaceId) throw new Error("Forbidden");
    return this.workspace.listMembers(id);
  }

  @Roles("ADMIN")
  @Post("/workspaces/:id/members/invite")
  invite(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: unknown,
    @CurrentUser() user: RequestUser
  ) {
    if (id !== user.workspaceId) throw new Error("Forbidden");
    return this.workspace.invite(id, body as Parameters<WorkspaceService["invite"]>[1]);
  }
}
