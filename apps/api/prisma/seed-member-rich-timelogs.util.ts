/** Pure helpers for rich member timelog seeding (weekdays, slots, no overlap). */

export const DEFAULT_MEMBER_EMAILS = [
  "admin@kloqra.dev",
  "member@kloqra.dev",
  "drew@kloqra.dev"
] as const;

export const DEFAULT_RANGE = {
  start: { y: 2026, m: 7, d: 1 },
  end: { y: 2026, m: 8, d: 20 }
} as const;

/** Four separated blocks totalling 8h exactly (>= 4 entries, >= 8h). */
export const WEEKDAY_ENTRY_SLOTS = [
  { startH: 9, startM: 0, durationMin: 120 },
  { startH: 11, startM: 30, durationMin: 120 },
  { startH: 14, startM: 0, durationMin: 120 },
  { startH: 16, startM: 15, durationMin: 120 }
] as const;

export type CalendarDay = { y: number; m: number; d: number };

export type TimelogSlotPlan = {
  day: CalendarDay;
  start: Date;
  end: Date;
  durationSec: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function calendarDayKey(day: CalendarDay): string {
  return `${day.y}-${pad2(day.m)}-${pad2(day.d)}`;
}

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  if (timeZone === "UTC") return 0;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => Number(parts.find((p) => p.type === type)?.value);

    let hour = getVal("hour");
    if (hour === 24) hour = 0;

    const tzDateUtc = Date.UTC(
      getVal("year"),
      getVal("month") - 1,
      getVal("day"),
      hour,
      getVal("minute"),
      getVal("second")
    );
    return tzDateUtc - date.getTime();
  } catch {
    return 0;
  }
}

/** UTC instant for local midnight on Y-M-D in the given IANA timezone. */
export function localMidnightUtc(y: number, m: number, d: number, timeZone: string): Date {
  if (timeZone === "UTC") {
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const offsetMs = getTimezoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offsetMs);
}

/** UTC instant for local wall clock on a calendar day (DST-safe via midnight + offset). */
export function localWallTimeUtc(
  day: CalendarDay,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const midnight = localMidnightUtc(day.y, day.m, day.d, timeZone);
  return new Date(midnight.getTime() + (hour * 60 + minute) * 60 * 1000);
}

export function isWeekdayInZone(day: CalendarDay, timeZone: string): boolean {
  const noon = localWallTimeUtc(day, 12, 0, timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  return weekday !== "Sat" && weekday !== "Sun";
}

export function* iterateCalendarDays(from: CalendarDay, to: CalendarDay): Generator<CalendarDay> {
  let cursor = new Date(Date.UTC(from.y, from.m - 1, from.d));
  const end = new Date(Date.UTC(to.y, to.m - 1, to.d));
  while (cursor <= end) {
    yield {
      y: cursor.getUTCFullYear(),
      m: cursor.getUTCMonth() + 1,
      d: cursor.getUTCDate()
    };
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
}

export function listWeekdaysInRange(
  from: CalendarDay,
  to: CalendarDay,
  timeZone: string
): CalendarDay[] {
  const days: CalendarDay[] = [];
  for (const day of iterateCalendarDays(from, to)) {
    if (isWeekdayInZone(day, timeZone)) days.push(day);
  }
  return days;
}

export function planDayEntries(day: CalendarDay, timeZone: string): TimelogSlotPlan[] {
  return WEEKDAY_ENTRY_SLOTS.map((slot) => {
    const start = localWallTimeUtc(day, slot.startH, slot.startM, timeZone);
    const end = new Date(start.getTime() + slot.durationMin * 60 * 1000);
    return {
      day,
      start,
      end,
      durationSec: slot.durationMin * 60
    };
  });
}

/** Returns true when no pair overlaps (end exclusive semantics). */
export function entriesHaveNoOverlap(plans: readonly TimelogSlotPlan[]): boolean {
  for (let i = 0; i < plans.length; i++) {
    for (let j = i + 1; j < plans.length; j++) {
      const a = plans[i]!;
      const b = plans[j]!;
      if (a.start < b.end && b.start < a.end) return false;
    }
  }
  return true;
}

export function totalHours(plans: readonly TimelogSlotPlan[]): number {
  return plans.reduce((sum, p) => sum + p.durationSec, 0) / 3600;
}

export function findOverlapsInBatch(
  rows: readonly { userId: string; startTime: Date; endTime: Date }[]
): string[] {
  const byUser = new Map<string, { startTime: Date; endTime: Date }[]>();
  for (const row of rows) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }

  const errors: string[] = [];
  for (const [userId, entries] of byUser) {
    const sorted = [...entries].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      if (curr.startTime < prev.endTime) {
        errors.push(
          `${userId}: overlap ${prev.startTime.toISOString()} – ${prev.endTime.toISOString()} with ${curr.startTime.toISOString()} – ${curr.endTime.toISOString()}`
        );
      }
    }
  }
  return errors;
}
