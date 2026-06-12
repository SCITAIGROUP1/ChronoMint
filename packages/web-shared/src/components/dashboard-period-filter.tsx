"use client";

import { DateRangePicker, SegmentedControl, cn } from "@kloqra/ui";
import type { ReactNode } from "react";
import type { DashboardPeriodPreset } from "../utils/dashboard-period-presets.js";

export type DashboardPeriodSelection = DashboardPeriodPreset | "custom";

export type DashboardPeriodFilterOption = {
  value: DashboardPeriodPreset;
  label: string;
};

export type DashboardPeriodFilterProps = {
  range: DashboardPeriodSelection;
  onPresetChange: (preset: DashboardPeriodPreset) => void;
  startDate: string;
  endDate: string;
  onDateRangeChange: (from: string, to: string) => void;
  presets: DashboardPeriodFilterOption[];
  weekStartsOn?: 0 | 1;
  dateRangeAriaLabel?: string;
  className?: string;
};

function FilterFieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

export function DashboardPeriodFilter({
  range,
  onPresetChange,
  startDate,
  endDate,
  onDateRangeChange,
  presets,
  weekStartsOn = 1,
  dateRangeAriaLabel = "Date range",
  className
}: DashboardPeriodFilterProps) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4", className)}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(220px,280px)] md:items-end md:gap-5">
        <div className="flex min-w-0 flex-col gap-2">
          <FilterFieldLabel>Period</FilterFieldLabel>
          <SegmentedControl
            value={range}
            onChange={onPresetChange}
            options={presets}
            size="sm"
            fullWidth
          />
        </div>

        <div className="hidden md:block w-px self-stretch bg-border/60" aria-hidden />

        <div className="flex min-w-0 flex-col gap-2">
          <FilterFieldLabel>Range</FilterFieldLabel>
          <DateRangePicker
            from={startDate}
            to={endDate}
            onChange={onDateRangeChange}
            weekStartsOn={weekStartsOn}
            ariaLabel={dateRangeAriaLabel}
            className="w-full"
            numberOfMonths={2}
            popoverAlign="end"
          />
        </div>
      </div>
    </div>
  );
}
