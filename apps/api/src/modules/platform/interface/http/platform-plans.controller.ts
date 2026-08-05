import { ROUTES, updatePlatformPlanSchema } from "@kloqra/contracts";
import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
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
import { PlatformPlansService } from "../../application/platform-plans.service";

@Controller()
@UseGuards(PlatformJwtAuthGuard, PermissionGuard)
export class PlatformPlansController {
  constructor(private plans: PlatformPlansService) {}

  @Get(ROUTES.PLATFORM.PLANS)
  @RequirePermission("platform:ReadPlanCatalog", { scope: "platform" })
  list(@CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.plans.listPlans();
  }

  @Get(ROUTES.PLATFORM.PLAN(":id"))
  @RequirePermission("platform:ReadPlanCatalog", { scope: "platform" })
  detail(@Param("id") id: string, @CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.plans.getPlan(id);
  }

  @Patch(ROUTES.PLATFORM.PLAN(":id"))
  @RequirePermission("platform:ManagePlanCatalog", { scope: "platform" })
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePlatformPlanSchema)) body: unknown,
    @CurrentPlatformUser() user: PlatformRequestUser,
    @Req() req: Request
  ) {
    return this.plans.updatePlan(
      id,
      body as Parameters<PlatformPlansService["updatePlan"]>[1],
      platformAuditContextFromRequest(user, req)
    );
  }
}
