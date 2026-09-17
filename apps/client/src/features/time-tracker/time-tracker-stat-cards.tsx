"use client";

import { Card, CardContent, DashboardStatCard, StatStrip } from "@kloqra/ui";
import { Clock, DollarSign, FileText, Hourglass } from "lucide-react";
import type { TimeTrackerStats } from "./time-tracker-stats";

type TimeTrackerStatCardsProps = {
  stats: TimeTrackerStats;
  loading?: boolean;
};

export function TimeTrackerStatCards({ stats, loading = false }: TimeTrackerStatCardsProps) {
  const loadingHint = loading ? "Updating totals…" : undefined;
  return (
    <StatStrip>
      <Card density="compact" className="border-primary/10 shadow-sm">
        <CardContent className="p-2.5">
          <DashboardStatCard
            label={stats.periodLabel}
            value={stats.totalHours}
            icon={Clock}
            tone="primary"
          />
        </CardContent>
      </Card>
      <Card density="compact" className="border-primary/10 shadow-sm">
        <CardContent className="p-2.5">
          <DashboardStatCard
            label="Billable"
            value={stats.billableHours}
            hint={stats.billablePercent}
            icon={DollarSign}
            tone="success"
          />
        </CardContent>
      </Card>
      <Card density="compact" className="border-primary/10 shadow-sm">
        <CardContent className="p-2.5">
          <DashboardStatCard
            label="Pending Approval"
            value={stats.pendingHours}
            hint={
              stats.pendingCount > 0
                ? `${stats.pendingCount} entr${stats.pendingCount === 1 ? "y" : "ies"}`
                : "None pending"
            }
            icon={Hourglass}
            tone="warning"
          />
        </CardContent>
      </Card>
      <Card density="compact" className="border-primary/10 shadow-sm">
        <CardContent className="p-2.5">
          <DashboardStatCard
            label="Entries"
            value={String(stats.entryCount)}
            hint={loadingHint}
            icon={FileText}
            tone="premium"
          />
        </CardContent>
      </Card>
    </StatStrip>
  );
}
