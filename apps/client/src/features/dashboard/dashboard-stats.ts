import type { TimeLogDto } from "@kloqra/contracts";
import {
  logStartDateKey,
  resolveLogDurationSec,
  todayInZone,
  toDateKeyInZone
} from "@kloqra/web-shared";

export type TodayStatsInput = {
  logs: TimeLogDto[];
  timezone: string;
  activeTimerSec?: number;
  isBillableActive?: boolean;
  /** Override for tests — YYYY-MM-DD in the workspace timezone */
  todayDateKey?: string;
};

/** Today totals — preference-TZ start-day attribution (shared with Timesheet headers). */
export function computeTodayStats({
  logs,
  timezone,
  activeTimerSec = 0,
  isBillableActive = false,
  todayDateKey
}: TodayStatsInput) {
  const todayStr = todayDateKey ?? toDateKeyInZone(todayInZone(timezone), timezone);

  let totalSec = 0;
  let billableSec = 0;

  for (const log of logs) {
    if (logStartDateKey(log, timezone) !== todayStr) continue;
    const sec = resolveLogDurationSec(log);
    totalSec += sec;
    if (log.isBillable) billableSec += sec;
  }

  if (activeTimerSec > 0) {
    totalSec += activeTimerSec;
    if (isBillableActive) billableSec += activeTimerSec;
  }

  return {
    totalSec,
    billableSec,
    totalHours: Math.round((totalSec / 3600) * 100) / 100,
    billableHours: Math.round((billableSec / 3600) * 100) / 100
  };
}
