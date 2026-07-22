import {
  addTeamMemberSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  listProjectTeamQuerySchema,
  updateProjectSchema,
  updateTeamMemberSchema,
  createTeamInviteSchema,
  provisionProjectTeamMembersSchema,
  type ListProjectsQuery,
  type ListProjectTeamQuery,
  type ProvisionProjectTeamMembersDto,
  type UpdateTeamMemberDto,
  ROUTES
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { ProjectsService } from "../../application/projects.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get(ROUTES.PROJECTS.LIST)
  @RequirePermission("workspace:ListProjects", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  list(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(listProjectsQuerySchema)) query: ListProjectsQuery,
    @Headers("x-auth-scope") authScope?: string
  ) {
    return this.projects.list(user.workspaceId, user.userId, user.role, query, {
      adminScope: authScope === "admin",
      managedProjectIds: user.managedProjectIds
    });
  }

  @Post(ROUTES.PROJECTS.CREATE)
  @RequirePermission("workspace:CreateProject", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  create(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createProjectSchema)) body: unknown
  ) {
    return this.projects.create(user.workspaceId, body as Parameters<ProjectsService["create"]>[1]);
  }

  @Get(ROUTES.PROJECTS.BY_ID(":id"))
  @RequirePermission("project:Read", {
    scope: "project",
    projectId: { source: "route", parameter: "id" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  get(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    return this.projects.get(user.workspaceId, user.userId, user.role, id);
  }

  @Patch(ROUTES.PROJECTS.BY_ID(":id"))
  @RequirePermission("project:Update", {
    scope: "project",
    projectId: { source: "route", parameter: "id" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  update(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: unknown
  ) {
    return this.projects.update(
      user.workspaceId,
      id,
      body as Parameters<ProjectsService["update"]>[2]
    );
  }

  @Delete(ROUTES.PROJECTS.BY_ID(":id"))
  @RequirePermission("workspace:DeleteProject", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  remove(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    return this.projects.remove(user.workspaceId, id);
  }

  @Get(ROUTES.PROJECTS.TEAM(":id"))
  @RequirePermission("project:ListTeam", {
    scope: "project",
    projectId: { source: "route", parameter: "id" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" }
  })
  getTeam(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(listProjectTeamQuerySchema)) query: ListProjectTeamQuery
  ) {
    return this.projects.getTeam(user.workspaceId, user.userId, user.role, id, query);
  }

  @Get(ROUTES.PROJECTS.TEAM_ROSTER(":id"))
  @RequirePermission("project:ListTeam", {
    scope: "project",
    projectId: { source: "route", parameter: "id" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" }
  })
  getMemberTeamRoster(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(listProjectTeamQuerySchema)) query: ListProjectTeamQuery
  ) {
    return this.projects.getMemberTeamRoster(user.workspaceId, user.userId, user.role, id, query);
  }

  @Post(ROUTES.PROJECTS.TEAM_MEMBERS(":id"))
  @RequirePermission("project:ManageTeam", {
    scope: "project",
    projectId: { source: "route", parameter: "id" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" }
  })
  addTeamMember(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addTeamMemberSchema)) body: unknown
  ) {
    return this.projects.addTeamMember(
      user.workspaceId,
      user.userId,
      user.role,
      id,
      body as Parameters<ProjectsService["addTeamMember"]>[4]
    );
  }

  @Post(ROUTES.PROJECTS.TEAM_MEMBERS_PROVISION(":id"))
  @RequirePermission("project:ManageTeam", {
    scope: "project",
    projectId: { source: "route", parameter: "id" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" }
  })
  provisionTeamMembers(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(provisionProjectTeamMembersSchema))
    body: ProvisionProjectTeamMembersDto
  ) {
    return this.projects.provisionTeamMembers(user.workspaceId, user.userId, user.role, id, body);
  }

  @Get(ROUTES.PROJECTS.TEAM_MEMBERS_BULK_TEMPLATE(":id"))
  @RequirePermission("project:ManageTeam", {
    scope: "project",
    projectId: { source: "route", parameter: "id" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" }
  })
  async getBulkProjectInviteTemplate(
    @Param("id") id: string,
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Res() res: Response
  ) {
    return this.projects.generateBulkProjectInviteTemplate(
      user.workspaceId,
      user.userId,
      user.role,
      id,
      res
    );
  }

  @Post(ROUTES.PROJECTS.TEAM_MEMBERS_BULK_UPLOAD(":id"))
  @RequirePermission("project:ManageTeam", {
    scope: "project",
    projectId: { source: "route", parameter: "id" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" }
  })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  async bulkProjectInviteUpload(
    @Param("id") id: string,
    @UploadedFile() file: { buffer: Buffer; originalname?: string } | undefined,
    @WorkspaceUser() user: WorkspaceRequestUser
  ) {
    if (!file?.buffer) {
      throw new Error("No file uploaded");
    }
    const members = await this.projects.parseBulkProjectInviteFile(file.buffer, file.originalname);
    return this.projects.enqueueBulkProjectInvite(
      user.workspaceId,
      user.userId,
      user.role,
      id,
      members
    );
  }

  @Get(ROUTES.PROJECTS.TEAM_MEMBERS_BULK_JOB(":id", ":jobId"))
  @RequirePermission("project:ManageTeam", {
    scope: "project",
    projectId: { source: "route", parameter: "id" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" }
  })
  getBulkProjectInviteJob(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Param("jobId") jobId: string
  ) {
    return this.projects.getBulkInviteJobStatus(
      user.workspaceId,
      user.userId,
      user.role,
      id,
      jobId
    );
  }

  @Patch(ROUTES.PROJECTS.TEAM_MEMBER(":projectId", ":memberId"))
  @RequirePermission("project:ManageTeam", {
    scope: "project",
    projectId: { source: "route", parameter: "projectId" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" }
  })
  updateTeamMember(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("projectId") projectId: string,
    @Param("memberId") memberId: string,
    @Body(new ZodValidationPipe(updateTeamMemberSchema)) body: UpdateTeamMemberDto
  ) {
    return this.projects.updateTeamMember(
      user.workspaceId,
      projectId,
      memberId,
      body,
      user.role,
      user.userId
    );
  }

  @Delete(ROUTES.PROJECTS.TEAM_MEMBER(":projectId", ":memberId"))
  @RequirePermission("project:ManageTeam", {
    scope: "project",
    projectId: { source: "route", parameter: "projectId" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" }
  })
  removeTeamMember(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("projectId") projectId: string,
    @Param("memberId") memberId: string
  ) {
    return this.projects.removeTeamMember(
      user.workspaceId,
      user.userId,
      user.role,
      projectId,
      memberId
    );
  }

  @Post(ROUTES.PROJECTS.TEAM_INVITES(":id"))
  @RequirePermission("project:ManageTeam", {
    scope: "project",
    projectId: { source: "route", parameter: "id" },
    expectedWorkspaceId: { source: "session", field: "workspaceId" }
  })
  createTeamInvite(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(createTeamInviteSchema)) body: unknown
  ) {
    return this.projects.createTeamInvite(
      user.workspaceId,
      id,
      user.userId,
      body as Parameters<ProjectsService["createTeamInvite"]>[3],
      user.role
    );
  }
}
