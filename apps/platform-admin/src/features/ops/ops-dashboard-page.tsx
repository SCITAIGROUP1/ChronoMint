"use client";

import { CenteredLoader } from "@kloqra/ui";
import { usePlatformOpsSummary } from "@kloqra/web-shared";
import { Activity, AlertTriangle, Building2, CreditCard, Users, Workflow } from "lucide-react";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Building2;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </div>
    </div>
  );
}

export function OpsDashboardPage() {
  const { summary, loading, error } = usePlatformOpsSummary();

  if (loading) return <CenteredLoader label="Loading ops summary…" />;
  if (error || !summary) {
    return <div className="p-6 text-sm text-destructive">{error ?? "Ops summary unavailable"}</div>;
  }

  const failedJobs = Object.values(summary.queues).reduce((sum, queue) => sum + queue.failed, 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ops</h1>
        <p className="text-sm text-muted-foreground">
          Fleet health — tenants, subscriptions, usage, and background queues.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Active tenants"
          value={summary.tenants.active}
          hint={`${summary.tenants.pendingSetup} pending setup`}
          icon={Building2}
        />
        <StatCard
          label="Trial subscriptions"
          value={summary.subscriptions.trial}
          hint={`${summary.tenants.suspended} suspended orgs`}
          icon={Activity}
        />
        <StatCard
          label="Past due"
          value={summary.subscriptions.pastDue}
          hint={`${summary.subscriptions.canceled} canceled`}
          icon={AlertTriangle}
        />
        <StatCard
          label="MRR (Stripe)"
          value={summary.mrr ? formatUsd(summary.mrr.amountCents) : "—"}
          hint={summary.mrr ? "Active + trialing" : "Stripe not configured"}
          icon={CreditCard}
        />
        <StatCard
          label="Total seats"
          value={summary.usage.totalSeats}
          hint={`${summary.usage.totalWorkspaces} workspaces`}
          icon={Users}
        />
        <StatCard
          label="Failed queue jobs"
          value={failedJobs}
          hint={`${summary.reconcile.driftCount} subscription drift`}
          icon={Workflow}
        />
      </div>

      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Queue depth</h2>
        </div>
        <div className="divide-y divide-border">
          {Object.entries(summary.queues).map(([name, counts]) => (
            <div
              key={name}
              className="grid grid-cols-5 gap-2 px-4 py-3 text-sm"
              data-testid={`ops-queue-${name}`}
            >
              <span className="col-span-2 font-medium">{name}</span>
              <span className="text-muted-foreground">wait {counts.waiting}</span>
              <span className="text-muted-foreground">active {counts.active}</span>
              <span className={counts.failed > 0 ? "text-destructive" : "text-muted-foreground"}>
                failed {counts.failed}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
