"use client";

import {
  AppBarSecondary,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  WeekDatePicker,
  cn,
  controlHeightClass,
  dateFromKey,
  dateKeyFromDate
} from "@kloqra/ui";
import { ChevronLeft, ChevronRight, Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import { TimesheetPeriodHours } from "./timesheet-period-hours";
import {
  ALL_WEEKDAY_INDEXES,
  sameWeekdays,
  timesheetDisplayActiveCount,
  WEEKDAY_SHORT_LABELS,
  WORK_WEEKDAY_INDEXES,
  type WeekdayIndex
} from "./timesheet-visible-days";

type ViewMode = "day" | "week" | "month";

export type TimesheetToolbarProps = {
  view: ViewMode;
  anchor: Date;
  rangeLabel: string;
  weekStartPref: "monday" | "sunday";
  periodTotalSec: number;
  visibleWeekdays: WeekdayIndex[];
  weekdayOrder: WeekdayIndex[];
  onWeekdaysPreset: (days: WeekdayIndex[]) => void;
  onVisibleWeekdayChange: (day: WeekdayIndex, visible: boolean) => void;
  showOccupancyOverlay: boolean;
  onToggleOccupancy: () => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onAnchorChange: (next: Date) => void;
  onViewChange: (view: ViewMode) => void;
};

function periodStepLabel(view: ViewMode, direction: "previous" | "next"): string {
  const unit = view === "month" ? "month" : view === "day" ? "day" : "week";
  return `${direction === "previous" ? "Previous" : "Next"} ${unit}`;
}

export function TimesheetToolbar({
  view,
  anchor,
  rangeLabel,
  weekStartPref,
  periodTotalSec,
  visibleWeekdays,
  weekdayOrder,
  onWeekdaysPreset,
  onVisibleWeekdayChange,
  showOccupancyOverlay,
  onToggleOccupancy,
  onToday,
  onPrev,
  onNext,
  onAnchorChange,
  onViewChange
}: TimesheetToolbarProps) {
  const showDisplay = view === "day" || view === "week";

  return (
    <AppBarSecondary
      leading={
        <div
          className="flex min-w-0 flex-nowrap items-center gap-2"
          data-testid="timesheet-toolbar"
        >
          <Button
            type="button"
            variant="outline"
            className={cn(controlHeightClass, "px-3")}
            onClick={onToday}
          >
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(controlHeightClass, "w-10")}
              onClick={onPrev}
              aria-label={periodStepLabel(view, "previous")}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(controlHeightClass, "w-10")}
              onClick={onNext}
              aria-label={periodStepLabel(view, "next")}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <WeekDatePicker
            anchorDate={dateKeyFromDate(anchor)}
            onChange={(key) => onAnchorChange(dateFromKey(key))}
            label={rangeLabel}
            weekStartsOn={weekStartPref === "sunday" ? 0 : 1}
            highlightMode={view}
            className={controlHeightClass}
            ariaLabel={
              view === "week" ? "Jump to week" : view === "month" ? "Jump to month" : "Jump to day"
            }
          />
          <TimesheetPeriodHours totalSec={periodTotalSec} view={view} />
        </div>
      }
      trailing={
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 items-center rounded-lg border border-border bg-card p-0.5"
            role="group"
            aria-label="Timesheet view"
          >
            {(["day", "week", "month"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={view === mode ? "default" : "ghost"}
                className="h-9 capitalize"
                onClick={() => onViewChange(mode)}
              >
                {mode}
              </Button>
            ))}
          </div>
          {showDisplay ? (
            <TimesheetDisplayMenu
              view={view}
              visibleWeekdays={visibleWeekdays}
              weekdayOrder={weekdayOrder}
              onWeekdaysPreset={onWeekdaysPreset}
              onVisibleWeekdayChange={onVisibleWeekdayChange}
              showOccupancyOverlay={showOccupancyOverlay}
              onToggleOccupancy={onToggleOccupancy}
            />
          ) : null}
        </div>
      }
    />
  );
}

export function TimesheetDisplayMenu({
  view,
  visibleWeekdays,
  weekdayOrder,
  onWeekdaysPreset,
  onVisibleWeekdayChange,
  showOccupancyOverlay,
  onToggleOccupancy
}: {
  view: ViewMode;
  visibleWeekdays: WeekdayIndex[];
  weekdayOrder: WeekdayIndex[];
  onWeekdaysPreset: (days: WeekdayIndex[]) => void;
  onVisibleWeekdayChange: (day: WeekdayIndex, visible: boolean) => void;
  showOccupancyOverlay: boolean;
  onToggleOccupancy: () => void;
}) {
  const activeCount = timesheetDisplayActiveCount({
    view,
    visibleWeekdays,
    showOccupancyOverlay
  });
  const triggerLabel = activeCount > 0 ? `Display, ${activeCount} active` : "Display";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(controlHeightClass, "shrink-0 gap-2")}
          aria-label={triggerLabel}
          data-testid="timesheet-display-trigger"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Display
          {activeCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-card p-3">
        <div className="flex flex-col gap-4" data-testid="timesheet-display-menu">
          {view === "week" ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-foreground">Visible days</p>
              <div
                className="flex flex-wrap items-center gap-1"
                role="group"
                aria-label="Visible weekdays"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={
                    sameWeekdays(visibleWeekdays, WORK_WEEKDAY_INDEXES) ? "secondary" : "ghost"
                  }
                  className="h-8 px-2.5 text-xs"
                  onClick={() => onWeekdaysPreset([...WORK_WEEKDAY_INDEXES])}
                >
                  Weekdays
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    sameWeekdays(visibleWeekdays, ALL_WEEKDAY_INDEXES) ? "secondary" : "ghost"
                  }
                  className="h-8 px-2.5 text-xs"
                  onClick={() => onWeekdaysPreset([...ALL_WEEKDAY_INDEXES])}
                >
                  All
                </Button>
                <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
                {weekdayOrder.map((day) => {
                  const checked = visibleWeekdays.includes(day);
                  const onlyOneLeft = checked && visibleWeekdays.length === 1;
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={onlyOneLeft}
                      aria-pressed={checked}
                      aria-label={`${WEEKDAY_SHORT_LABELS[day]}${checked ? ", shown" : ", hidden"}`}
                      onClick={() => onVisibleWeekdayChange(day, !checked)}
                      className={cn(
                        "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-medium transition-colors",
                        checked
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        onlyOneLeft && "opacity-60"
                      )}
                    >
                      {WEEKDAY_SHORT_LABELS[day]}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-foreground">Occupied time</p>
            <Button
              type="button"
              variant={showOccupancyOverlay ? "secondary" : "outline"}
              className="h-9 justify-start gap-2"
              onClick={onToggleOccupancy}
            >
              {showOccupancyOverlay ? (
                <>
                  <EyeOff className="size-4" aria-hidden />
                  Hide time logged elsewhere
                </>
              ) : (
                <>
                  <Eye className="size-4" aria-hidden />
                  Show time logged elsewhere
                </>
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
