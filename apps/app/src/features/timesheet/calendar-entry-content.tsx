"use client";

import { cn } from "@kloqra/ui";
import { Clock, Lock } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { formatDuration } from "./calendar-utils";
import {
  descriptionLineClampStyle,
  estimateDescriptionLineClamp,
  linesForContainerHeight,
  SHORT_ENTRY_SEC
} from "./description-line-clamp";

export type CalendarTaskInfo = {
  taskName: string;
  categoryName: string;
  projectName?: string;
};

type CalendarEntryContentProps = {
  task: CalendarTaskInfo;
  description?: string | null;
  durationSec: number;
  compact: boolean;
  variant?: "default" | "timer" | "live" | "locked" | "inactive";
  liveElapsedSec?: number;
  /** Pixels per 30-minute slot (timesheet zoom). */
  slotPx?: number;
};

export function CalendarEntryContent({
  task,
  description,
  durationSec,
  compact,
  variant = "default",
  liveElapsedSec,
  slotPx
}: CalendarEntryContentProps) {
  const elapsedLabel =
    variant === "live" && liveElapsedSec !== undefined
      ? formatDuration(liveElapsedSec)
      : formatDuration(durationSec);
  const isShort = durationSec < SHORT_ENTRY_SEC && variant !== "live";
  const trimmedDescription = description?.trim() || "";
  const showDescription = Boolean(trimmedDescription);
  const projectName = task.projectName?.trim() || "";
  const hasProject = Boolean(projectName);
  const isLocked = variant === "locked";
  const isInactive = variant === "inactive";
  const dense = compact || isShort;
  const hasCategoryRow = hasProject && !isShort;

  const estimatedLines = estimateDescriptionLineClamp(durationSec, {
    compact,
    hasProject,
    hasCategoryRow,
    slotPx
  });
  const descriptionWrapRef = useRef<HTMLDivElement>(null);
  const [lineClamp, setLineClamp] = useState(estimatedLines);

  useLayoutEffect(() => {
    setLineClamp(estimatedLines);
  }, [estimatedLines]);

  useLayoutEffect(() => {
    if (isShort || !showDescription) return;
    const wrap = descriptionWrapRef.current;
    if (!wrap) return;

    const measure = () => {
      const probe = wrap.firstElementChild as HTMLElement | null;
      const computed = probe ? getComputedStyle(probe).lineHeight : "";
      const parsed = Number.parseFloat(computed);
      const lineHeightPx = Number.isFinite(parsed) && parsed > 0 ? parsed : compact ? 11.5 : 12.5;
      setLineClamp(linesForContainerHeight(wrap.clientHeight, lineHeightPx));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [
    isShort,
    showDescription,
    compact,
    trimmedDescription,
    durationSec,
    hasProject,
    hasCategoryRow
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-left">
      {/* Layer 1 — Project (primary) + duration */}
      <div
        className={cn(
          "flex shrink-0 items-start justify-between gap-1",
          hasProject && !isShort && "mb-1 border-b border-current/15 pb-1"
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-1">
          {variant === "timer" && (
            <Clock className="mt-0.5 size-2.5 shrink-0 opacity-70" aria-hidden />
          )}
          {variant === "live" && (
            <span
              className="mt-1 size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400"
              aria-hidden
            />
          )}
          <p
            className={cn(
              "min-w-0 flex-1 truncate leading-tight",
              hasProject
                ? cn("font-semibold tracking-tight", dense ? "text-[10px]" : "text-[11px]")
                : cn(
                    "font-medium uppercase tracking-wide opacity-90",
                    dense ? "text-[8px]" : "text-[9px]"
                  )
            )}
            title={hasProject ? projectName : task.categoryName}
          >
            {hasProject ? projectName : task.categoryName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 pt-px">
          {isLocked || isInactive ? (
            <span
              title={
                isInactive
                  ? "Read-only — project, category, or task is inactive"
                  : "Locked — submitted or approved"
              }
            >
              <Lock
                className={cn("shrink-0 text-muted-foreground", dense ? "size-2.5" : "size-3")}
                aria-label={isInactive ? "Inactive" : "Locked"}
              />
            </span>
          ) : null}
          <span
            className={cn(
              "font-mono font-semibold tabular-nums leading-none",
              dense ? "text-[9px]" : "text-[10px]"
            )}
          >
            {elapsedLabel}
          </span>
        </div>
      </div>

      {/* Layer 2 — Task + category meta */}
      <div className={cn("shrink-0 space-y-0.5", !isShort && "mb-1")}>
        <p
          className={cn(
            "min-w-0 truncate leading-tight",
            hasProject
              ? cn("font-medium opacity-95", dense ? "text-[10px]" : "text-[11px]")
              : cn("font-semibold", dense ? "text-[10px]" : "text-[11px]")
          )}
          title={task.taskName}
        >
          {task.taskName}
        </p>
        {hasCategoryRow ? (
          <p
            className={cn(
              "truncate font-medium uppercase tracking-wide opacity-70",
              dense ? "text-[8px]" : "text-[9px]"
            )}
            title={task.categoryName}
          >
            {task.categoryName}
          </p>
        ) : null}
      </div>

      {/* Layer 3 — Description with dynamic line-clamp ellipsis */}
      {showDescription ? (
        isShort ? (
          <p
            className="min-w-0 truncate text-[9px] leading-snug opacity-75"
            title={trimmedDescription}
          >
            {trimmedDescription}
          </p>
        ) : (
          <div ref={descriptionWrapRef} className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <p
              className="break-words text-[9px] leading-snug opacity-75 sm:text-[10px]"
              style={descriptionLineClampStyle(lineClamp)}
              title={trimmedDescription}
              data-line-clamp={lineClamp}
            >
              {trimmedDescription}
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}
