import {
  inviteMemberSchema,
  updateWorkspaceSchema,
  updateWorkspaceMemberSchema,
  createWorkspaceSchema,
  bulkInviteMemberSchema,
  teamMembersOverviewQuerySchema,
  projectManagersOverviewQuerySchema,
  type InviteMemberDto,
  type TeamMembersOverviewQuery,
  type ProjectManagersOverviewQuery,
  ROUTES
} from "@kloqra/contracts";
import {
  Controller,
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
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { WorkspaceMatchGuard } from "../../../../common/guards/workspace-match.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { WorkspaceMembersOverviewService } from "../../application/workspace-members-overview.service";
import { WorkspaceProjectManagersOverviewService } from "../../application/workspace-project-managers-overview.service";
import { WorkspaceService } from "../../application/workspace.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard, WorkspaceMatchGuard)
export class WorkspaceController {
  constructor(
    private workspace: WorkspaceService,
    private overviewService: WorkspaceMembersOverviewService,
    private projectManagersOverviewService: WorkspaceProjectManagersOverviewService
  ) {}

  @Post(ROUTES.WORKSPACES.CREATE)
  @RequirePermission("tenant:CreateWorkspace", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  create(
    @Body(new ZodValidationPipe(createWorkspaceSchema)) body: unknown,
    @CurrentUser() user: RequestUser
  ) {
    return this.workspace.create(user.userId, body as Parameters<WorkspaceService["create"]>[1]);
  }

  @Get(ROUTES.WORKSPACES.LIST)
  list(@WorkspaceUser() _user: WorkspaceRequestUser) {
    return this.workspace.listForUser(_user.userId);
  }

  @Get(ROUTES.WORKSPACES.MEMBERS_OVERVIEW(":id"))
  @RequirePermission("workspace:ListMembers", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  membersOverview(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(teamMembersOverviewQuerySchema)) query: TeamMembersOverviewQuery,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.overviewService.getOverview(id, query);
  }

  @Get(ROUTES.WORKSPACES.PROJECT_MANAGERS_OVERVIEW(":id"))
  @RequirePermission("workspace:ListMembers", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  projectManagersOverview(
    @Param("id") id: string,
    @Query(new ZodValidationPipe(projectManagersOverviewQuerySchema))
    query: ProjectManagersOverviewQuery,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.projectManagersOverviewService.getOverview(id, query);
  }

  @Get(ROUTES.WORKSPACES.MEMBERS(":id"))
  @RequirePermission("workspace:ListMembers", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  members(@Param("id") id: string, @WorkspaceUser() _user: WorkspaceRequestUser) {
    return this.workspace.listMembers(id);
  }

  @Patch(ROUTES.WORKSPACES.MEMBER(":id", ":memberId"))
  @RequirePermission("workspace:ManageMembers", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  updateMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @Body(new ZodValidationPipe(updateWorkspaceMemberSchema)) body: unknown,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.updateMember(
      id,
      memberId,
      body as Parameters<WorkspaceService["updateMember"]>[2],
      _user.userId
    );
  }

  @Delete(ROUTES.WORKSPACES.MEMBER(":id", ":memberId"))
  @RequirePermission("workspace:ManageMembers", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  removeMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.removeMember(id, memberId, _user.userId);
  }

  @Post(ROUTES.WORKSPACES.INVITE(":id"))
  @RequirePermission("workspace:ManageMembers", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  invite(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: unknown,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.invite(
      id,
      body as Parameters<WorkspaceService["invite"]>[1],
      _user.userId
    );
  }

  @Get(ROUTES.WORKSPACES.BULK_MEMBERS_TEMPLATE(":id"))
  @RequirePermission("workspace:ManageMembers", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  async getBulkInviteTemplate(
    @Param("id") id: string,
    @WorkspaceUser() _user: WorkspaceRequestUser,
    @Res() res: Response
  ) {
    await this.workspace.generateBulkInviteTemplate(res);
  }

  @Post(ROUTES.WORKSPACES.BULK_MEMBERS_UPLOAD(":id"))
  @RequirePermission("workspace:ManageMembers", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  async bulkInviteUpload(
    @Param("id") id: string,
    @UploadedFile() file: any,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    if (!file) throw new Error("No file uploaded");

    const members = await this.workspace.parseBulkInviteExcel(file.buffer);
    return this.workspace.bulkInvite(id, members, _user.userId);
  }

  @Post(ROUTES.WORKSPACES.BULK_MEMBERS(":id"))
  @RequirePermission("workspace:ManageMembers", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  async bulkInvite(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(bulkInviteMemberSchema)) body: { members: InviteMemberDto[] },
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.bulkInvite(id, body.members, _user.userId);
  }

  @Post(ROUTES.WORKSPACES.RESEND_CREDENTIALS(":id", ":memberId"))
  @RequirePermission("workspace:ManageMembers", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  resendCredentials(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.resendMemberCredentials(id, memberId);
  }

  @Get(ROUTES.WORKSPACES.BY_ID(":id"))
  @RequirePermission("workspace:ReadSettings", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  getById(@Param("id") id: string, @WorkspaceUser() _user: WorkspaceRequestUser) {
    return this.workspace.getById(id);
  }

  @Patch(ROUTES.WORKSPACES.BY_ID(":id"))
  @RequirePermission("workspace:UpdateSettings", {
    scope: "workspace",
    workspaceId: { source: "route", parameter: "id" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) body: any,
    @WorkspaceUser() _user: WorkspaceRequestUser
  ) {
    return this.workspace.update(id, body);
  }
}
