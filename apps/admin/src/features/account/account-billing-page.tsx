"use client";

import { DEFAULT_PLAN_LIMITS, PLAN_SLUGS, type PaidPlanSlug } from "@kloqra/contracts";
import {
  AppBar,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CenteredLoader
} from "@kloqra/ui";
import {
  useCreateCheckoutSession,
  useCreatePortalSession,
  useTenantSubscription,
  getLegalUrls
} from "@kloqra/web-shared";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

const UPGRADE_PLANS: { slug: PaidPlanSlug; name: string }[] = [
  { slug: PLAN_SLUGS.STARTER, name: "Starter" },
  { slug: PLAN_SLUGS.PRO, name: "Pro" }
];

export function AccountBillingPage() {
  const { subscription, loading, error, reload } = useTenantSubscription();
  const { createCheckout, loading: checkoutLoading } = useCreateCheckoutSession();
  const { createPortal, loading: portalLoading } = useCreatePortalSession();
  const [upgradingSlug, setUpgradingSlug] = useState<PaidPlanSlug | null>(null);

  if (loading) return <CenteredLoader label="Loading billing…" />;
  if (error || !subscription) {
    return (
      <div className="p-6 text-sm text-destructive" data-testid="billing-error">
        {error ?? "Subscription unavailable"}
      </div>
    );
  }

  async function handleUpgrade(planSlug: PaidPlanSlug) {
    setUpgradingSlug(planSlug);
    const url = await createCheckout({ planSlug });
    setUpgradingSlug(null);
    if (url) {
      window.location.assign(url);
      return;
    }
    toast.error("Could not start checkout. Try again or contact support.");
  }

  async function handleManage() {
    const url = await createPortal();
    if (url) {
      window.location.assign(url);
      return;
    }
    toast.error("Billing portal is unavailable until a subscription is linked.");
  }

  const showPastDue =
    subscription.billingAlert === "past_due" || subscription.status === "past_due";
  const showTrialEnding = subscription.billingAlert === "trial_ending";
  const refundUrl = getLegalUrls().refund;

  return (
    <div className="space-y-6 p-6">
      <AppBar title="Billing" description="Subscription, upgrades, and plan limits." />

      {showPastDue ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          data-testid="billing-past-due-banner"
        >
          Payment is past due. Time logging is paused until you update billing.
        </div>
      ) : null}

      {showTrialEnding ? (
        <div
          className="rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-fg"
          data-testid="billing-trial-ending-banner"
        >
          Your trial ends on {formatDate(subscription.trialEndsAt)}. Choose a plan to keep access.
        </div>
      ) : null}

      <Card data-testid="billing-plan-card">
        <CardHeader>
          <CardTitle className="text-base">{subscription.planName}</CardTitle>
          <CardDescription>
            Status: <span className="capitalize text-foreground">{subscription.status}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Workspaces included</dt>
              <dd className="font-medium">{subscription.limits.maxWorkspaces}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Seats included</dt>
              <dd className="font-medium">{subscription.limits.maxSeats}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Trial ends</dt>
              <dd className="font-medium">{formatDate(subscription.trialEndsAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Current period ends</dt>
              <dd className="font-medium">{formatDate(subscription.currentPeriodEnd)}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!subscription.stripeCustomerId || portalLoading}
              onClick={() => void handleManage()}
              data-testid="billing-manage-button"
            >
              {portalLoading ? "Opening…" : "Manage subscription"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void reload()}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2" data-testid="billing-upgrade-plans">
        {UPGRADE_PLANS.map((plan) => {
          const limits = DEFAULT_PLAN_LIMITS[plan.slug];
          const isCurrent = subscription.planName.toLowerCase() === plan.name.toLowerCase();
          return (
            <Card key={plan.slug}>
              <CardHeader>
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <CardDescription>
                  {limits.maxWorkspaces} workspaces · {limits.maxSeats} seats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  disabled={isCurrent || checkoutLoading}
                  onClick={() => void handleUpgrade(plan.slug)}
                  data-testid={`billing-upgrade-${plan.slug}`}
                >
                  {upgradingSlug === plan.slug
                    ? "Redirecting…"
                    : isCurrent
                      ? "Current plan"
                      : `Upgrade to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Invoices and payment methods are managed in the{" "}
        <button type="button" className="underline" onClick={() => void handleManage()}>
          Stripe customer portal
        </button>
        .
        {refundUrl ? (
          <>
            {" "}
            See our{" "}
            <a href={refundUrl} target="_blank" rel="noopener noreferrer" className="underline">
              refund and cancellation policy
            </a>
            .
          </>
        ) : null}{" "}
        Need help? <Link href="/account">Return to account</Link>.
      </p>
    </div>
  );
}
