"use client";

import { Button, cn } from "@kloqra/ui";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  canZoomIn,
  canZoomOut,
  DEFAULT_TIMESHEET_SLOT_PX,
  zoomPercentLabel,
  type TimesheetSlotPx
} from "./timesheet-zoom";

type TimesheetZoomControlsProps = {
  slotPx: TimesheetSlotPx;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  className?: string;
  compact?: boolean;
};

export function TimesheetZoomControls({
  slotPx,
  onZoomIn,
  onZoomOut,
  onReset,
  className,
  compact = false
}: TimesheetZoomControlsProps) {
  const atDefault = slotPx === DEFAULT_TIMESHEET_SLOT_PX;
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="group"
      aria-label="Calendar zoom"
    >
      {!compact ? (
        <span className="mr-1 text-[11px] font-medium text-muted-foreground">Zoom</span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(compact ? "h-7 w-7" : "h-8 w-8")}
        onClick={onZoomOut}
        disabled={!canZoomOut(slotPx)}
        aria-label="Zoom out"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span
        className={cn(
          "min-w-[2.75rem] text-center tabular-nums text-muted-foreground",
          compact ? "text-[11px]" : "text-xs"
        )}
        aria-live="polite"
      >
        {zoomPercentLabel(slotPx)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(compact ? "h-7 w-7" : "h-8 w-8")}
        onClick={onZoomIn}
        disabled={!canZoomIn(slotPx)}
        aria-label="Zoom in"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(compact ? "h-7 w-7" : "h-8 w-8")}
        onClick={onReset}
        disabled={atDefault}
        aria-label="Reset zoom"
        title="Reset zoom"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
