import {
  inviteMemberSchema,
  updateWorkspaceSchema,
  updateWorkspaceMemberSchema,
  createWorkspaceSchema,
  bulkInviteMemberSchema,
  teamMembersOverviewQuerySchema,
  teamActivitiesQuerySchema,
  projectManagersOverviewQuerySchema,
  type TeamActivitiesQuery,
  type InviteMemberDto,
  type TeamMembersOverviewQuery,
  type ProjectManagersOverviewQuery,
  ROUTES,
  ErrorCodes
} from "@kloqra/contracts";
import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFile
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { WorkspaceMembersOverviewService } from "../../application/workspace-members-overview.service";
import { WorkspaceProjectManagersOverviewService } from "../../application/workspace-project-managers-overview.service";
import { WorkspaceTeamActivitiesService } from "../../application/workspace-team-activities.service";
import { WorkspaceService } from "../../application/workspace.service";

function assertWorkspaceRoute(workspaceId: string, user: RequestUser): void {
  if (workspaceId !== user.workspaceId) {
    throw new ForbiddenException({
      code: ErrorCodes.FORBIDDEN,
      message: "Forbidden"
    });
  }
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkspaceController {
  constructor(
    private workspace: WorkspaceService,
    private overviewService: WorkspaceMembersOverviewService,
    private projectManagersOverviewService: WorkspaceProjectManagersOverviewService,
    private teamActivitiesService: WorkspaceTeamActivitiesService
  ) {}

  @Post(ROUTES.WORKSPACES.CREATE)
  create(
    @Body(new ZodValidationPipe(createWorkspaceSchema)) body: unknown,
    @CurrentUser() user: RequestUser
  ) {
    return this.workspace.create(user.userId, body as Parameters<WorkspaceService["create"]>[1]);
  }

  @Get(ROUTES.WORKSPACES.LIST)
  list(@CurrentUser() user: RequestUser) {
    return this.workspace.listForUser(user.userId);
  }

  @Roles("ADMIN")
  @Get(ROUTES.WORKSPACES.MEMBERS_OVERVIEW(":id"))
  membersOverview(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(teamMembersOverviewQuerySchema)) query: TeamMembersOverviewQuery,
    @CurrentUser() user: RequestUser
  ) {
    assertWorkspaceRoute(id, user);
    return this.overviewService.getOverview(id, query);
  }

  @Roles("ADMIN")
  @Get(ROUTES.WORKSPACES.PROJECT_MANAGERS_OVERVIEW(":id"))
  projectManagersOverview(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(projectManagersOverviewQuerySchema))
    query: ProjectManagersOverviewQuery,
    @CurrentUser() user: RequestUser
  ) {
    assertWorkspaceRoute(id, user);
    return this.projectManagersOverviewService.getOverview(id, query);
  }

  @Get(ROUTES.WORKSPACES.MEMBERS(":id"))
  members(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    assertWorkspaceRoute(id, user);
    return this.workspace.listMembers(id);
  }

  @Get(ROUTES.WORKSPACES.TEAM_ACTIVITIES(":id"))
  teamActivities(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(teamActivitiesQuerySchema)) query: TeamActivitiesQuery,
    @CurrentUser() user: RequestUser
  ) {
    assertWorkspaceRoute(id, user);
    return this.teamActivitiesService.getTeamActivities(id, query);
  }

  @Roles("ADMIN")
  @Patch(ROUTES.WORKSPACES.MEMBER(":id", ":memberId"))
  updateMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @Body(new ZodValidationPipe(updateWorkspaceMemberSchema)) body: unknown,
    @CurrentUser() user: RequestUser
  ) {
    assertWorkspaceRoute(id, user);
    return this.workspace.updateMember(
      id,
      memberId,
      body as Parameters<WorkspaceService["updateMember"]>[2],
      user.userId
    );
  }

  @Roles("ADMIN")
  @Delete(ROUTES.WORKSPACES.MEMBER(":id", ":memberId"))
  removeMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @CurrentUser() user: RequestUser
  ) {
    assertWorkspaceRoute(id, user);
    return this.workspace.removeMember(id, memberId, user.userId);
  }

  @Roles("ADMIN")
  @Post(ROUTES.WORKSPACES.INVITE(":id"))
  invite(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: unknown,
    @CurrentUser() user: RequestUser
  ) {
    assertWorkspaceRoute(id, user);
    return this.workspace.invite(
      id,
      body as Parameters<WorkspaceService["invite"]>[1],
      user.userId
    );
  }

  @Roles("ADMIN")
  @Get(ROUTES.WORKSPACES.BULK_MEMBERS_TEMPLATE(":id"))
  async getBulkInviteTemplate(
    @Param("id") id: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response
  ) {
    assertWorkspaceRoute(id, user);
    await this.workspace.generateBulkInviteTemplate(res);
  }

  @Roles("ADMIN")
  @Post(ROUTES.WORKSPACES.BULK_MEMBERS_UPLOAD(":id"))
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  async bulkInviteUpload(
    @Param("id") id: string,
    @UploadedFile() file: any,
    @CurrentUser() user: RequestUser
  ) {
    assertWorkspaceRoute(id, user);
    if (!file) throw new Error("No file uploaded");

    const members = await this.workspace.parseBulkInviteExcel(file.buffer);
    return this.workspace.bulkInvite(id, members, user.userId);
  }

  @Roles("ADMIN")
  @Post(ROUTES.WORKSPACES.BULK_MEMBERS(":id"))
  async bulkInvite(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(bulkInviteMemberSchema)) body: { members: InviteMemberDto[] },
    @CurrentUser() user: RequestUser
  ) {
    assertWorkspaceRoute(id, user);
    return this.workspace.bulkInvite(id, body.members, user.userId);
  }

  @Roles("ADMIN")
  @Post(ROUTES.WORKSPACES.RESEND_CREDENTIALS(":id", ":memberId"))
  resendCredentials(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @CurrentUser() user: RequestUser
  ) {
    assertWorkspaceRoute(id, user);
    return this.workspace.resendMemberCredentials(id, memberId);
  }

  @Roles("ADMIN")
  @Get(ROUTES.WORKSPACES.BY_ID(":id"))
  getById(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    assertWorkspaceRoute(id, user);
    return this.workspace.getById(id);
  }

  @Roles("ADMIN")
  @Patch(ROUTES.WORKSPACES.BY_ID(":id"))
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) body: any,
    @CurrentUser() user: RequestUser
  ) {
    assertWorkspaceRoute(id, user);
    return this.workspace.update(id, body);
  }
}
