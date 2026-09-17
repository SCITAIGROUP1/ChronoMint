"use client";

import type { ReactNode } from "react";

export const DASHBOARD_FILTERS_TOOLBAR_CONTENT_CLASS =
  "grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2";

type DashboardFiltersToolbarProps = {
  period: ReactNode;
  scope: ReactNode;
};

/** Period + Filters stay on a stable row; applied chips span the row below. */
export function DashboardFiltersToolbar({ period, scope }: DashboardFiltersToolbarProps) {
  return (
    <div
      className={DASHBOARD_FILTERS_TOOLBAR_CONTENT_CLASS}
      data-testid="dashboard-filters-toolbar"
    >
      <div className="min-w-0">{period}</div>
      {scope}
    </div>
  );
}
