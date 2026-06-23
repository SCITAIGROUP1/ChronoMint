import {
  PLAN_SLUGS,
  type PlanSlug,
  type SubscriptionStatus,
  type TenantSubscriptionDto
} from "@kloqra/contracts";
import { Injectable } from "@nestjs/common";
import type Stripe from "stripe";
import { generatedPrisma } from "../../../common/prisma/generated-prisma.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { SubscriptionNotificationsService } from "./subscription-notifications.service";
import { toSubscriptionDto } from "./subscriptions.mapper";

@Injectable()
export class SubscriptionSyncService {
  constructor(
    private prisma: PrismaService,
    private notifications: SubscriptionNotificationsService
  ) {}

  private db() {
    return generatedPrisma(this.prisma);
  }

  mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case "trialing":
        return "trial";
      case "active":
        return "active";
      case "past_due":
      case "unpaid":
        return "past_due";
      case "canceled":
      case "incomplete_expired":
        return "canceled";
      case "paused":
        return "suspended";
      default:
        return "active";
    }
  }

  private async resolvePlanIdFromStripePrice(
    priceId: string | null | undefined
  ): Promise<string | null> {
    if (!priceId) return null;
    const plan = await this.db().plan.findFirst({
      where: { stripePriceId: priceId },
      select: { id: true }
    });
    return plan?.id ?? null;
  }

  async syncFromStripeSubscription(
    stripeSub: Stripe.Subscription,
    options?: { previousStatus?: string }
  ): Promise<TenantSubscriptionDto | null> {
    const tenantId =
      stripeSub.metadata?.tenantId ?? (await this.findTenantIdByStripeSubscription(stripeSub.id));
    if (!tenantId) return null;

    const priceId = stripeSub.items.data[0]?.price?.id;
    const planId = (await this.resolvePlanIdFromStripePrice(priceId)) ?? undefined;
    const status = this.mapStripeStatus(stripeSub.status);
    const currentPeriodEnd = stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : null;
    const trialEndsAt = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null;

    const updated = await this.db().tenantSubscription.update({
      where: { tenantId },
      data: {
        status,
        stripeCustomerId: String(stripeSub.customer),
        stripeSubscriptionId: stripeSub.id,
        currentPeriodEnd,
        trialEndsAt: status === "trial" ? trialEndsAt : null,
        ...(planId ? { planId } : {})
      },
      include: { plan: true }
    });

    if (options?.previousStatus !== "past_due" && status === "past_due") {
      await this.notifications.notifyPaymentFailed(tenantId);
    }

    return toSubscriptionDto(updated);
  }

  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) return;

    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id;
    const stripeSubscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    const planSlug = session.metadata?.planSlug as PlanSlug | undefined;
    let planId: string | undefined;
    if (planSlug) {
      const plan = await this.db().plan.findUnique({ where: { slug: planSlug } });
      planId = plan?.id;
    }

    await this.db().tenantSubscription.update({
      where: { tenantId },
      data: {
        ...(planId ? { planId } : {}),
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
        ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
        status: "active"
      }
    });
  }

  async handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
    const tenantId =
      stripeSub.metadata?.tenantId ?? (await this.findTenantIdByStripeSubscription(stripeSub.id));
    if (!tenantId) return;

    await this.db().tenantSubscription.update({
      where: { tenantId },
      data: { status: "canceled" }
    });
  }

  async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId =
      typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
    if (!subscriptionId) return;

    const tenantId = await this.findTenantIdByStripeSubscription(subscriptionId);
    if (!tenantId) return;

    const existing = await this.db().tenantSubscription.findUnique({
      where: { tenantId },
      select: { status: true }
    });

    await this.db().tenantSubscription.update({
      where: { tenantId },
      data: { status: "past_due" }
    });

    if (existing?.status !== "past_due") {
      await this.notifications.notifyPaymentFailed(tenantId);
    }
  }

  private async findTenantIdByStripeSubscription(
    stripeSubscriptionId: string
  ): Promise<string | null> {
    const row = await this.db().tenantSubscription.findFirst({
      where: { stripeSubscriptionId },
      select: { tenantId: true }
    });
    return row?.tenantId ?? null;
  }

  async findPlanSlugByPriceId(priceId: string): Promise<PlanSlug | null> {
    const plan = await this.db().plan.findFirst({
      where: { stripePriceId: priceId },
      select: { slug: true }
    });
    if (!plan) return null;
    if (
      plan.slug === PLAN_SLUGS.PILOT ||
      plan.slug === PLAN_SLUGS.STARTER ||
      plan.slug === PLAN_SLUGS.PRO
    ) {
      return plan.slug;
    }
    return null;
  }
}
