import type { CSSProperties } from "react";

/** Calendar slots are `h-10` (40px) per 30 minutes — used to estimate description lines. */
const SLOT_PX = 40;
const SLOT_SEC = 30 * 60;
export const SHORT_ENTRY_SEC = 15 * 60;

export type DescriptionLineClampOptions = {
  compact?: boolean;
  hasProject?: boolean;
  /** Category meta row under task when project is shown */
  hasCategoryRow?: boolean;
};

/**
 * Estimates how many description lines fit in an entry block from its duration.
 * Used for first paint; ResizeObserver refines when the DOM is available.
 */
export function estimateDescriptionLineClamp(
  durationSec: number,
  options: DescriptionLineClampOptions = {}
): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 1;
  if (durationSec < SHORT_ENTRY_SEC) return 1;

  const heightPx = (durationSec / SLOT_SEC) * SLOT_PX;

  // Header chrome inside the colored block (project, task, category, gaps)
  let chromePx = 30;
  if (options.hasProject) chromePx += 8;
  if (options.hasCategoryRow) chromePx += 11;

  const linePx = options.compact ? 11.5 : 12.5;
  const lines = Math.floor((heightPx - chromePx) / linePx);
  return Math.max(1, Math.min(24, lines));
}

export function descriptionLineClampStyle(lines: number): CSSProperties {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: Math.max(1, lines),
    overflow: "hidden"
  };
}

/** Measure how many lines fit in a container given a CSS line-height. */
export function linesForContainerHeight(heightPx: number, lineHeightPx: number): number {
  if (!Number.isFinite(heightPx) || heightPx <= 0) return 1;
  const lh = Number.isFinite(lineHeightPx) && lineHeightPx > 0 ? lineHeightPx : 12;
  return Math.max(1, Math.min(24, Math.floor(heightPx / lh)));
}
