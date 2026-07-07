import {
  createReportingApiKeySchema,
  reportingApiKeyListSchema,
  updateReportingApiKeySchema,
  ROUTES,
  type CreateReportingApiKeyDto,
  type UpdateReportingApiKeyDto
} from "@kloqra/contracts";
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Roles } from "../../../../common/decorators/roles.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { ReportingApiCredentialService } from "../../application/reporting-api-credential.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingApiKeysController {
  constructor(private credentials: ReportingApiCredentialService) {}

  @Roles("ADMIN")
  @Get(ROUTES.REPORTING_API_KEYS.LIST)
  async list(@WorkspaceUser() user: WorkspaceRequestUser) {
    const items = await this.credentials.list(user.workspaceId, user.tenantId);
    return reportingApiKeyListSchema.parse({ items });
  }

  @Roles("ADMIN")
  @Post(ROUTES.REPORTING_API_KEYS.CREATE)
  create(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createReportingApiKeySchema)) body: CreateReportingApiKeyDto
  ) {
    return this.credentials.create(user.workspaceId, user.tenantId, body);
  }

  @Roles("ADMIN")
  @Patch(ROUTES.REPORTING_API_KEYS.BY_ID(":id"))
  update(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateReportingApiKeySchema)) body: UpdateReportingApiKeyDto
  ) {
    return this.credentials.update(user.workspaceId, user.tenantId, id, body);
  }

  @Roles("ADMIN")
  @Delete(ROUTES.REPORTING_API_KEYS.BY_ID(":id"))
  async revoke(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    await this.credentials.revoke(user.workspaceId, user.tenantId, id);
    return { ok: true };
  }
}
