import { todayInZone, toDateKeyInZone } from "@kloqra/web-shared";

/** Calendar-day anchor for the missing-timesheets list API. */
export function resolveMissingTimesheetsAnchorDateKey(
  filtersFrom: string | undefined,
  timezone: string
): string {
  return filtersFrom ?? toDateKeyInZone(todayInZone(timezone), timezone);
}
