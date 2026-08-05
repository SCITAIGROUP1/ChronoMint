import {
  ROUTES,
  updatePlatformCatalogSettingsSchema,
  type UpdatePlatformCatalogSettingsDto
} from "@kloqra/contracts";
import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
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
import { PlatformCatalogSettingsService } from "../../application/platform-catalog-settings.service";

@Controller()
@UseGuards(PlatformJwtAuthGuard, PermissionGuard)
export class PlatformCatalogSettingsController {
  constructor(private settings: PlatformCatalogSettingsService) {}

  @Get(ROUTES.PLATFORM.CATALOG_SETTINGS)
  @RequirePermission("platform:ReadPlanCatalog", { scope: "platform" })
  get(@CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.settings.getSettings();
  }

  @Patch(ROUTES.PLATFORM.CATALOG_SETTINGS)
  @RequirePermission("platform:ManagePlanCatalog", { scope: "platform" })
  update(
    @Body(new ZodValidationPipe(updatePlatformCatalogSettingsSchema))
    body: UpdatePlatformCatalogSettingsDto,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.settings.updateSettings(body, platformAuditContextFromRequest(user, req));
  }
}
