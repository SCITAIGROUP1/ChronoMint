import {
  createPlatformTenantSchema,
  extendPlatformTenantTrialSchema,
  listPlatformTenantsQuerySchema,
  ROUTES,
  updatePlatformTenantSchema,
  type CreatePlatformTenantDto,
  type ExtendPlatformTenantTrialDto,
  type UpdatePlatformTenantDto
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { type Request } from "express";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { PlatformJwtAuthGuard } from "../../../../common/guards/platform-jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { platformAuditContextFromRequest } from "../../application/platform-audit-context.util";
import { PlatformTenantsService } from "../../application/platform-tenants.service";

@Controller()
@UseGuards(PlatformJwtAuthGuard, PermissionGuard)
export class PlatformTenantsController {
  constructor(private platformTenants: PlatformTenantsService) {}

  @Get(ROUTES.PLATFORM.TENANTS)
  @RequirePermission("platform:ListTenants", { scope: "platform" })
  list(
    @Query(new ZodValidationPipe(listPlatformTenantsQuerySchema)) query: unknown,
    @CurrentPlatformUser() _user: PlatformRequestUser
  ) {
    return this.platformTenants.listTenants(
      query as Parameters<PlatformTenantsService["listTenants"]>[0]
    );
  }

  @Post(ROUTES.PLATFORM.TENANTS)
  @RequirePermission("platform:ManageTenants", { scope: "platform" })
  create(
    @Body(new ZodValidationPipe(createPlatformTenantSchema)) body: CreatePlatformTenantDto,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.platformTenants.createTenant(body, platformAuditContextFromRequest(user, req));
  }

  @Get(`${ROUTES.PLATFORM.TENANTS}/:id`)
  @RequirePermission("platform:ListTenants", { scope: "platform" })
  detail(@Param("id") id: string, @CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.platformTenants.getTenant(id);
  }

  @Patch(`${ROUTES.PLATFORM.TENANTS}/:id`)
  @RequirePermission("platform:ManageTenants", { scope: "platform" })
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePlatformTenantSchema)) body: UpdatePlatformTenantDto,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.platformTenants.updateTenant(id, body, platformAuditContextFromRequest(user, req));
  }

  @Post(ROUTES.PLATFORM.TENANT_EXTEND_TRIAL(":id"))
  @RequirePermission("platform:ManageTenantLimits", { scope: "platform" })
  extendTrial(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(extendPlatformTenantTrialSchema))
    body: ExtendPlatformTenantTrialDto,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.platformTenants.extendTrial(id, body, platformAuditContextFromRequest(user, req));
  }

  @Post(ROUTES.PLATFORM.SUSPEND_TENANT(":id"))
  @RequirePermission("platform:ManageTenants", { scope: "platform" })
  suspend(
    @Param("id") id: string,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.platformTenants.suspendTenant(id, platformAuditContextFromRequest(user, req));
  }

  @Delete(ROUTES.PLATFORM.TENANT_DELETE(":id"))
  @RequirePermission("platform:ManageTenants", { scope: "platform" })
  delete(
    @Param("id") id: string,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.platformTenants.deleteTenant(id, platformAuditContextFromRequest(user, req));
  }
}
