import {
  changeSubscriptionPlanSchema,
  createCheckoutSessionSchema,
  ErrorCodes,
  ROUTES,
  type ChangeSubscriptionPlanDto,
  type CreateCheckoutSessionDto
} from "@kloqra/contracts";
import { Body, Controller, ForbiddenException, Patch, Post, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { TenantScoped } from "../../../../common/decorators/tenant-scoped.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { isBillingSimulated } from "../../application/billing-mode.util";
import { SubscriptionBillingService } from "../../application/subscription-billing.service";
import { SubscriptionsService } from "../../application/subscriptions.service";

@Controller()
@TenantScoped()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SubscriptionBillingController {
  constructor(
    private billing: SubscriptionBillingService,
    private subscriptions: SubscriptionsService
  ) {}

  @Patch(ROUTES.TENANTS.SUBSCRIPTION)
  @RequirePermission("tenant:ManageBilling", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  changePlan(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(changeSubscriptionPlanSchema)) body: ChangeSubscriptionPlanDto
  ) {
    if (!isBillingSimulated()) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "Direct plan changes are only available in simulated billing mode"
      });
    }
    return this.subscriptions.changePlan(user.tenantId, body.planSlug);
  }

  @Post(ROUTES.TENANTS.CHECKOUT)
  @RequirePermission("tenant:ManageBilling", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  createCheckout(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createCheckoutSessionSchema)) body: CreateCheckoutSessionDto
  ) {
    return this.billing.createCheckoutSession(user.tenantId, body);
  }

  @Post(ROUTES.TENANTS.PORTAL)
  @RequirePermission("tenant:ManageBilling", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  createPortal(@CurrentUser() user: RequestUser) {
    return this.billing.createPortalSession(user.tenantId);
  }
}
