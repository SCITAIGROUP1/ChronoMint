import { SLOT_MINUTES } from "./calendar-utils";
import { SHORT_ENTRY_SEC } from "./description-line-clamp";

/** Sub-10-minute entries get a hairline left accent so chrome doesn't dominate slot proportion. */
export const HAIRLINE_ENTRY_SEC = 10 * 60;

/**
 * Visual chrome for calendar blocks.
 * Uses a left accent (horizontal border only) so height% stays true to duration
 * (e.g. 6 min = 1/5 of a 30-min slot). No top/bottom border that eats vertical space.
 */
export function calendarEntryChromeClass(
  durationSec: number,
  opts?: { dashed?: boolean; dotted?: boolean }
): string {
  if (opts?.dashed) {
    return "rounded-[3px] border border-dashed border-muted-foreground/40";
  }
  if (opts?.dotted) {
    return "rounded-[3px] border border-dotted border-muted-foreground/35";
  }
  if (durationSec < HAIRLINE_ENTRY_SEC) {
    return "rounded-[2px] border-l border-l-black/30 dark:border-l-white/35";
  }
  if (durationSec < SHORT_ENTRY_SEC) {
    return "rounded-[3px] border-l-2 border-l-black/25 dark:border-l-white/30";
  }
  return "rounded-[3px] border-l-2 border-l-black/20 dark:border-l-white/25";
}

export function calendarEntryContentPaddingClass(durationSec: number): string {
  return durationSec < SHORT_ENTRY_SEC ? "px-1 py-0" : "px-1.5 py-0.5";
}

/** Horizontal inset class — keep a 1px gutter so adjacent-day blocks don't touch. */
export const CALENDAR_ENTRY_INSET_X = "left-px right-px";

/** Commit a resize only after real drag movement and a time change. */
export function shouldCommitResize(opts: {
  moved: boolean;
  originStart: Date;
  originEnd: Date;
  previewStart: Date;
  previewEnd: Date;
}): boolean {
  if (!opts.moved) return false;
  if (opts.previewEnd <= opts.previewStart) return false;
  return (
    opts.previewStart.getTime() !== opts.originStart.getTime() ||
    opts.previewEnd.getTime() !== opts.originEnd.getTime()
  );
}

/** Skip no-op updates that would otherwise toast "Time entry updated!". */
export function entryTimesChanged(
  log: { startTime: string; endTime: string },
  start: Date,
  end: Date
): boolean {
  return (
    start.getTime() !== new Date(log.startTime).getTime() ||
    end.getTime() !== new Date(log.endTime).getTime()
  );
}

/** Height of a duration relative to one calendar slot (0–1). */
export function slotProportion(durationMinutes: number): number {
  return durationMinutes / SLOT_MINUTES;
}
