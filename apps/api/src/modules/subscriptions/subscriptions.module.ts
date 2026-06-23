import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PlanLimitService } from "./application/plan-limit.service";
import { PublicPlansService } from "./application/public-plans.service";
import { StripeWebhookService } from "./application/stripe-webhook.service";
import { SubscriptionBillingService } from "./application/subscription-billing.service";
import { SubscriptionNotificationsService } from "./application/subscription-notifications.service";
import { SubscriptionReconcileService } from "./application/subscription-reconcile.service";
import { SubscriptionSyncService } from "./application/subscription-sync.service";
import { SubscriptionTrialCronService } from "./application/subscription-trial-cron.service";
import { SubscriptionsService } from "./application/subscriptions.service";
import { PublicPlansController } from "./interface/http/public-plans.controller";
import { StripeWebhookController } from "./interface/http/stripe-webhook.controller";
import { SubscriptionBillingController } from "./interface/http/subscription-billing.controller";
import { StripeClient } from "./stripe/stripe.client";

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [StripeWebhookController, SubscriptionBillingController, PublicPlansController],
  providers: [
    StripeClient,
    SubscriptionsService,
    PlanLimitService,
    SubscriptionSyncService,
    SubscriptionNotificationsService,
    StripeWebhookService,
    SubscriptionBillingService,
    SubscriptionReconcileService,
    SubscriptionTrialCronService,
    PublicPlansService
  ],
  exports: [SubscriptionsService, PlanLimitService, StripeClient, SubscriptionSyncService]
})
export class SubscriptionsModule {}
