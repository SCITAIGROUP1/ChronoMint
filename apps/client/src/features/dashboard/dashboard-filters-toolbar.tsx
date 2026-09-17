"use client";

import { Card, CardContent } from "@kloqra/ui";
import type { ReactNode } from "react";

export const DASHBOARD_FILTERS_TOOLBAR_CONTENT_CLASS =
  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4";

type DashboardFiltersToolbarProps = {
  period: ReactNode;
  scope: ReactNode;
};

/** Period + Filters stay on a stable row; applied chips span the row below. */
export function DashboardFiltersToolbar({ period, scope }: DashboardFiltersToolbarProps) {
  return (
    <Card
      className="gap-0 border-border/70 py-0 shadow-none"
      data-testid="dashboard-filters-toolbar"
    >
      <CardContent className={DASHBOARD_FILTERS_TOOLBAR_CONTENT_CLASS}>
        <div className="min-w-0">{period}</div>
        {scope}
      </CardContent>
    </Card>
  );
}
