import {
  createHourlyRateSchema,
  listHourlyRatesQuerySchema,
  reportQuerySchema,
  type ListHourlyRatesQuery,
  ROUTES
} from "@kloqra/contracts";
import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { CommercialFeaturesGuard } from "../../../../common/guards/commercial-features.guard";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { BillingService } from "../../application/billing.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard, CommercialFeaturesGuard)
export class BillingController {
  constructor(private billing: BillingService) {}

  @RequirePermission("workspace:ManageBillingRates", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  @Get(ROUTES.BILLING.RATES)
  listRates(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(listHourlyRatesQuerySchema)) query: ListHourlyRatesQuery
  ) {
    return this.billing.listRates(user.workspaceId, query);
  }

  @RequirePermission("workspace:ManageBillingRates", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  @Post(ROUTES.BILLING.RATES)
  createRate(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createHourlyRateSchema)) body: unknown
  ) {
    return this.billing.createRate(
      user.workspaceId,
      body as Parameters<BillingService["createRate"]>[1]
    );
  }

  @Roles("ADMIN")
  @UseGuards(RolesGuard)
  @Get(ROUTES.BILLING.SUMMARY)
  summary(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    return this.billing.summary(
      user.workspaceId,
      query as Parameters<BillingService["summary"]>[1]
    );
  }
}
