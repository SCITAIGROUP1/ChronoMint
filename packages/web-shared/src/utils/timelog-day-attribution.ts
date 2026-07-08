import { toDateKeyInZone } from "./dashboard-period-presets";

export type DurationLogLike = {
  startTime: string;
  endTime?: string;
  durationSec?: number;
  isBillable?: boolean;
};

/**
 * Canonical day attribution for totals across Timesheet / Time Tracker / Dashboard:
 * an entry's **full** duration belongs to the calendar day of `startTime` in the
 * user's preference timezone (never clipped across midnight for totals).
 *
 * Overnight entries may still *render* across midnight on calendars; day headers
 * and stats must use this rule so every surface agrees.
 */
export function logStartDateKey(log: Pick<DurationLogLike, "startTime">, timezone: string): string {
  return toDateKeyInZone(new Date(log.startTime), timezone);
}

export function resolveLogDurationSec(log: DurationLogLike): number {
  if (typeof log.durationSec === "number" && Number.isFinite(log.durationSec)) {
    return Math.max(0, log.durationSec);
  }
  if (!log.endTime) return 0;
  const startMs = new Date(log.startTime).getTime();
  const endMs = new Date(log.endTime).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return 0;
  return Math.max(0, (endMs - startMs) / 1000);
}

export function sumDurationSecForDateKey(
  logs: readonly DurationLogLike[],
  dateKey: string,
  timezone: string
): number {
  let total = 0;
  for (const log of logs) {
    if (logStartDateKey(log, timezone) !== dateKey) continue;
    total += resolveLogDurationSec(log);
  }
  return total;
}

/** Count of finished entries whose preference-TZ start day is `dateKey`. */
export function countLogsForDateKey(
  logs: readonly DurationLogLike[],
  dateKey: string,
  timezone: string
): number {
  let count = 0;
  for (const log of logs) {
    if (logStartDateKey(log, timezone) === dateKey) count += 1;
  }
  return count;
}

export type ActiveTimerOnStartDay = {
  startedAt: string;
  elapsedSec: number;
  liveElapsedSec?: number;
};

/** Whole running session counts on the preference-TZ day the timer started. */
export function sumDurationSecForDateKeyWithTimer(
  logs: readonly DurationLogLike[],
  dateKey: string,
  timezone: string,
  activeTimer?: ActiveTimerOnStartDay | null
): number {
  const total = sumDurationSecForDateKey(logs, dateKey, timezone);
  if (!activeTimer) return total;
  if (toDateKeyInZone(new Date(activeTimer.startedAt), timezone) !== dateKey) return total;
  return total + Math.max(0, activeTimer.liveElapsedSec ?? activeTimer.elapsedSec);
}
