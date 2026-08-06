"use client";

import { DateRangePicker, SegmentedControl, cn } from "@kloqra/ui";
import { useEffect, useRef, useState } from "react";
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

/** Two-month picker needs enough width; otherwise use a single month. */
const WIDE_FILTER_MIN_PX = 640;

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
  const rootRef = useRef<HTMLDivElement>(null);
  const [wideLayout, setWideLayout] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const sync = (width: number) => setWideLayout(width >= WIDE_FILTER_MIN_PX);
    sync(node.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => {
      sync(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "@container flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap",
        className
      )}
      role="group"
      aria-label="Period"
    >
      <div className="min-w-0 shrink">
        <SegmentedControl value={range} onChange={onPresetChange} options={presets} size="sm" />
      </div>
      <DateRangePicker
        from={startDate}
        to={endDate}
        onChange={onDateRangeChange}
        weekStartsOn={weekStartsOn}
        ariaLabel={dateRangeAriaLabel}
        className="h-9 w-auto min-w-[12.5rem] max-w-[16.5rem] shrink-0"
        numberOfMonths={wideLayout ? 2 : 1}
        popoverAlign="end"
      />
    </div>
  );
}
