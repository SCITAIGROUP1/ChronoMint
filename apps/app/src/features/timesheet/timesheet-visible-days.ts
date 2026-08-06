/** JS getDay(): 0 = Sunday … 6 = Saturday */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ALL_WEEKDAY_INDEXES: WeekdayIndex[] = [0, 1, 2, 3, 4, 5, 6];

/** Mon–Fri — common “hide weekends” preset */
export const WORK_WEEKDAY_INDEXES: WeekdayIndex[] = [1, 2, 3, 4, 5];

export const WEEKDAY_SHORT_LABELS: Record<WeekdayIndex, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat"
};

export function sameWeekdays(a: readonly WeekdayIndex[], b: readonly WeekdayIndex[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((d) => set.has(d));
}

/** Column order for the day-visibility checkboxes, respecting week-start preference. */
export function weekdayCheckboxOrder(weekStart: "monday" | "sunday"): WeekdayIndex[] {
  if (weekStart === "sunday") {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  return [1, 2, 3, 4, 5, 6, 0];
}

export function parseVisibleWeekdays(raw: string | null): WeekdayIndex[] | null {
  if (raw == null || raw === "") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const days = parsed
      .map((n) => Number(n))
      .filter((n): n is WeekdayIndex => Number.isInteger(n) && n >= 0 && n <= 6);
    const unique = [...new Set(days)] as WeekdayIndex[];
    return unique.length > 0 ? unique : null;
  } catch {
    return null;
  }
}

export function serializeVisibleWeekdays(days: readonly WeekdayIndex[]): string {
  return JSON.stringify([...new Set(days)].sort((a, b) => a - b));
}

export function filterDaysByVisibleWeekdays(
  days: Date[],
  visible: readonly WeekdayIndex[]
): Date[] {
  if (visible.length === 0) return days;
  const set = new Set(visible);
  const filtered = days.filter((d) => set.has(d.getDay() as WeekdayIndex));
  return filtered.length > 0 ? filtered : days;
}

export function toggleVisibleWeekday(
  current: readonly WeekdayIndex[],
  day: WeekdayIndex,
  checked: boolean
): WeekdayIndex[] {
  if (checked) {
    if (current.includes(day)) return [...current];
    return [...current, day].sort((a, b) => a - b) as WeekdayIndex[];
  }
  const next = current.filter((d) => d !== day) as WeekdayIndex[];
  // Keep at least one day so the week grid never collapses to empty.
  return next.length > 0 ? next : current.slice();
}
