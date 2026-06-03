export const SLOT_MINUTES = 30;
export const CALENDAR_START_HOUR = 6;
export const CALENDAR_END_HOUR = 22;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Monday-based week start */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function slotStart(day: Date, hour: number, minute: number): Date {
  const start = new Date(day);
  start.setHours(hour, minute, 0, 0);
  return start;
}

export function slotEnd(start: Date): Date {
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + SLOT_MINUTES);
  return end;
}

export function formatDayHeader(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = weekStart.toLocaleDateString(undefined, opts);
  const endStr = weekEnd.toLocaleDateString(undefined, {
    ...opts,
    year: weekStart.getFullYear() !== weekEnd.getFullYear() ? "numeric" : undefined
  });
  return `${startStr} – ${endStr}, ${weekEnd.getFullYear()}`;
}

export function formatTimeLabel(hour: number, minute: number): string {
  const d = new Date(2000, 0, 1, hour, minute);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: minute === 0 ? undefined : "2-digit"
  });
}

export function getVisibleMinutes(): number {
  return (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60;
}

function minutesFromCalendarStart(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() - CALENDAR_START_HOUR * 60;
}

export function clipLogToDay(
  log: { startTime: string; endTime: string },
  day: Date
): { start: Date; end: Date } | null {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const logStart = new Date(log.startTime);
  const logEnd = new Date(log.endTime);
  const start = new Date(Math.max(logStart.getTime(), dayStart.getTime()));
  const end = new Date(Math.min(logEnd.getTime(), dayEnd.getTime()));
  if (end <= start) return null;
  return { start, end };
}

export function blockStyle(start: Date, end: Date): { top: string; height: string } {
  const total = getVisibleMinutes();
  const topMin = Math.max(0, minutesFromCalendarStart(start));
  const endMin = Math.min(total, minutesFromCalendarStart(end));
  const heightMin = Math.max(20, endMin - topMin);
  return {
    top: `${(topMin / total) * 100}%`,
    height: `${(heightMin / total) * 100}%`
  };
}

export function buildSlotRows(): { hour: number; minute: number }[] {
  const rows: { hour: number; minute: number }[] = [];
  for (let hour = CALENDAR_START_HOUR; hour < CALENDAR_END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      rows.push({ hour, minute });
    }
  }
  return rows;
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return startOfDay(new Date(y, m - 1, d));
}

export function toTimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function combineDayAndTime(dateKey: string, time: string): Date {
  const day = fromDateKey(dateKey);
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  day.setHours(h || 0, m || 0, 0, 0);
  return day;
}

export function formatDraftDateLabel(
  draft: { date: string },
  log?: { startTime: string } | null
): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
    return fromDateKey(draft.date).toLocaleDateString(undefined, opts);
  }
  if (log?.startTime) {
    const d = new Date(log.startTime);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(undefined, opts);
  }
  return "";
}

export function slotIndexFromTime(hour: number, minute: number): number {
  const rows = buildSlotRows();
  return rows.findIndex((r) => r.hour === hour && r.minute === minute);
}

export function timeFromSlotIndex(index: number): { hour: number; minute: number } {
  return buildSlotRows()[index];
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function endOfMonth(d: Date): Date {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() + 1);
  x.setDate(0);
  return startOfDay(x);
}

export function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Monday-first grid cells for a month (null = padding) */
export function getMonthGrid(month: Date): (Date | null)[][] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const startPad = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function pointerYToTime(
  day: Date,
  clientY: number,
  columnTop: number,
  columnHeight: number
): Date {
  const ratio = Math.max(0, Math.min(1, (clientY - columnTop) / columnHeight));
  const total = getVisibleMinutes();
  const slotCount = Math.floor(total / SLOT_MINUTES);
  const slotIndex = Math.min(slotCount - 1, Math.round(ratio * slotCount));
  const { hour, minute } = timeFromSlotIndex(slotIndex);
  const result = new Date(day);
  result.setHours(hour, minute, 0, 0);
  return result;
}

export function totalSecondsOnDay(
  logs: { startTime: string; endTime: string }[],
  day: Date
): number {
  return logs.reduce((sum, log) => {
    const clip = clipLogToDay(log, day);
    if (!clip) return sum;
    return sum + (clip.end.getTime() - clip.start.getTime()) / 1000;
  }, 0);
}
