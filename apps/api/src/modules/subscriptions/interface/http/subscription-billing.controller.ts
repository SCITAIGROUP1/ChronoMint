import {
  createCheckoutSessionSchema,
  ROUTES,
  type CreateCheckoutSessionDto
} from "@kloqra/contracts";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { TenantRoles } from "../../../../common/decorators/tenant-roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { TenantRolesGuard } from "../../../../common/guards/tenant-roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { SubscriptionBillingService } from "../../application/subscription-billing.service";

@Controller()
@UseGuards(JwtAuthGuard, TenantRolesGuard)
export class SubscriptionBillingController {
  constructor(private billing: SubscriptionBillingService) {}

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.CHECKOUT)
  createCheckout(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createCheckoutSessionSchema)) body: CreateCheckoutSessionDto
  ) {
    return this.billing.createCheckoutSession(user.tenantId, body);
  }

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.PORTAL)
  createPortal(@CurrentUser() user: RequestUser) {
    return this.billing.createPortalSession(user.tenantId);
  }
}
