"use client";

import { Card, CardContent } from "@kloqra/ui";
import type { ReactNode } from "react";

export const DASHBOARD_FILTERS_TOOLBAR_CONTENT_CLASS =
  "flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4";

type DashboardFiltersToolbarProps = {
  period: ReactNode;
  scope: ReactNode;
};

/** Compact single-row period + scope controls for Overview / Dashboard. */
export function DashboardFiltersToolbar({ period, scope }: DashboardFiltersToolbarProps) {
  return (
    <Card className="border-border/70 shadow-none" data-testid="dashboard-filters-toolbar">
      <CardContent className={DASHBOARD_FILTERS_TOOLBAR_CONTENT_CLASS}>
        {period}
        {scope}
      </CardContent>
    </Card>
  );
}
