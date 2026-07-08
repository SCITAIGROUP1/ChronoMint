"use client";

import { useEffect, useState } from "react";
import {
  nextLocalMidnightUtcInZone,
  todayInZone,
  toDateKeyInZone
} from "../utils/dashboard-period-presets";
import { useDisplayPreferences } from "./use-display-preferences";

/** Today as YYYY-MM-DD in the member display timezone; refreshes after local midnight. */
export function usePreferenceTodayDateKey(): string {
  const { timezone } = useDisplayPreferences();

  const [dateKey, setDateKey] = useState(() => toDateKeyInZone(todayInZone(timezone), timezone));

  useEffect(() => {
    const refresh = () => setDateKey(toDateKeyInZone(todayInZone(timezone), timezone));
    refresh();

    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const currentKey = toDateKeyInZone(todayInZone(timezone), timezone);
      const ms = Math.max(
        nextLocalMidnightUtcInZone(currentKey, timezone).getTime() - Date.now(),
        60_000
      );
      timeoutId = setTimeout(() => {
        refresh();
        scheduleNext();
      }, ms);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [timezone]);

  return dateKey;
}
