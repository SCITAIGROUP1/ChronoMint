import {
  createReportingApiKeySchema,
  reportingApiKeyListSchema,
  updateReportingApiKeySchema,
  ROUTES,
  type CreateReportingApiKeyDto,
  type UpdateReportingApiKeyDto
} from "@kloqra/contracts";
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { ReportingApiCredentialService } from "../../application/reporting-api-credential.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class ReportingApiKeysController {
  constructor(private credentials: ReportingApiCredentialService) {}

  @Roles("ADMIN")
  @RequirePermission("workspace:ManageApiKeys", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  @Get(ROUTES.REPORTING_API_KEYS.LIST)
  async list(@WorkspaceUser() user: WorkspaceRequestUser) {
    const items = await this.credentials.list(user.workspaceId, user.tenantId, user.userId);
    return reportingApiKeyListSchema.parse({ items });
  }

  @Roles("ADMIN")
  @RequirePermission("workspace:ManageApiKeys", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  @Post(ROUTES.REPORTING_API_KEYS.CREATE)
  create(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createReportingApiKeySchema)) body: CreateReportingApiKeyDto
  ) {
    return this.credentials.create(user.workspaceId, user.tenantId, user.userId, body);
  }

  @Roles("ADMIN")
  @RequirePermission("workspace:ManageApiKeys", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  @Patch(ROUTES.REPORTING_API_KEYS.BY_ID(":id"))
  update(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateReportingApiKeySchema)) body: UpdateReportingApiKeyDto
  ) {
    return this.credentials.update(user.workspaceId, user.tenantId, user.userId, id, body);
  }

  @Roles("ADMIN")
  @RequirePermission("workspace:ManageApiKeys", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  @Delete(ROUTES.REPORTING_API_KEYS.BY_ID(":id"))
  async revoke(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    await this.credentials.revoke(user.workspaceId, user.tenantId, user.userId, id);
    return { ok: true };
  }
}
