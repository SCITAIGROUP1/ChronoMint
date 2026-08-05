import {
  formatUserDate,
  type DateFormatPreference,
  type TimeFormatPreference
} from "@kloqra/contracts";

export type TimesheetDisplayFormat = {
  timezone: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
};

/** Compact row date for time tracker tables — e.g. "Jun 6". */
export function formatEntryShortDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatClockInZone(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false
    }).formatToParts(date);
    const getVal = (type: string) => parts.find((part) => part.type === type)?.value || "";
    let hour = getVal("hour");
    if (hour === "24") hour = "00";
    return `${hour.padStart(2, "0")}:${getVal("minute").padStart(2, "0")}`;
  } catch {
    const h = String(date.getUTCHours()).padStart(2, "0");
    const m = String(date.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}

/** Read-only clock range for time tracker rows — e.g. "09:00 – 10:30". */
export function formatEntryTimeRange(startTime: string, endTime: string, timezone: string): string {
  const start = formatClockInZone(new Date(startTime), timezone);
  const end = formatClockInZone(new Date(endTime), timezone);
  return `${start} – ${end}`;
}

/** Compact week header — e.g. "Week of Jun 6". */
export function formatWeekOfShortLabel(weekStart: Date, timezone: string): string {
  return `Week of ${formatEntryShortDate(weekStart, timezone)}`;
}

export function formatWeekOfLabel(weekStart: Date, format: TimesheetDisplayFormat): string {
  return `Week of ${formatUserDate(weekStart, format.dateFormat, format.timezone)}`;
}

export function formatEntryDateLabel(date: Date, format: TimesheetDisplayFormat): string {
  return formatUserDate(date, format.dateFormat, format.timezone);
}
