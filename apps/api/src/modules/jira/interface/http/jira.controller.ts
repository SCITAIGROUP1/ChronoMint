import {
  ROUTES,
  updateJiraCredentialsSchema,
  verifyUserJiraSchema,
  verifyWorkspaceJiraSchema,
  type UpdateJiraCredentialsDto,
  type VerifyUserJiraDto,
  type VerifyWorkspaceJiraDto
} from "@kloqra/contracts";
import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { JiraService } from "../../application/jira.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class JiraController {
  constructor(private jira: JiraService) {}

  @Get(ROUTES.JIRA.MY_ISSUES)
  @RequirePermission("personal:ManageIntegrations", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" },
    tenantId: { source: "session", field: "tenantId" }
  })
  getMyIssues(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.jira.getMyIssues(user.userId, user.workspaceId);
  }

  @Patch(ROUTES.JIRA.CREDENTIALS)
  @RequirePermission("personal:ManageIntegrations", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" },
    tenantId: { source: "session", field: "tenantId" }
  })
  updateCredentials(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(updateJiraCredentialsSchema)) body: unknown
  ) {
    return this.jira.updateCredentials(user.userId, body as UpdateJiraCredentialsDto);
  }

  @Post(ROUTES.JIRA.VERIFY)
  @RequirePermission("workspace:ManageIntegrations", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  verifyWorkspaceCredentials(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(verifyWorkspaceJiraSchema)) body: unknown
  ) {
    return this.jira.verifyWorkspaceCredentials(user.workspaceId, body as VerifyWorkspaceJiraDto);
  }

  @Post(ROUTES.JIRA.VERIFY_USER)
  @RequirePermission("personal:ManageIntegrations", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" },
    tenantId: { source: "session", field: "tenantId" }
  })
  verifyUserEmail(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(verifyUserJiraSchema)) body: unknown
  ) {
    return this.jira.verifyUserEmail(user.workspaceId, body as VerifyUserJiraDto);
  }
}
