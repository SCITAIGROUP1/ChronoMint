/**
 * Clockify-style duration parsing for time-entry forms.
 * - Decimal hours: `2.5` / `2,5` → 2h 30m
 * - Clock: `2:30` → 2h 30m
 * - Bare integer: `2` → 2 hours (not minutes)
 */

const HHMM = /^(\d+):([0-5]\d)$/;
const DECIMAL = /^(\d*)[.,](\d+)$/;
const INTEGER = /^(\d+)$/;

export function parseDurationInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const clock = trimmed.match(HHMM);
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 3600 + minutes * 60;
  }

  // Reject invalid clock forms like 2:60 before treating as decimal
  if (trimmed.includes(":")) return null;

  const decimal = trimmed.match(DECIMAL);
  if (decimal) {
    const whole = decimal[1] === "" ? 0 : Number(decimal[1]);
    const fracRaw = decimal[2];
    if (!Number.isFinite(whole)) return null;
    const frac = Number(`0.${fracRaw}`);
    if (!Number.isFinite(frac)) return null;
    const totalMinutes = Math.round(whole * 60 + frac * 60);
    if (totalMinutes < 0) return null;
    return totalMinutes * 60;
  }

  const integer = trimmed.match(INTEGER);
  if (integer) {
    const hours = Number(integer[1]);
    if (!Number.isFinite(hours) || hours < 0) return null;
    return hours * 3600;
  }

  return null;
}

export function formatDurationInput(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  const totalMinutes = Math.round(sec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function parseHHMM(value: string): { hours: number; minutes: number } | null {
  const m = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23) return null;
  return { hours, minutes };
}

/** Add duration to start HH:MM; clamp end to 23:59 if it would cross midnight. */
export function addDurationToStartTime(startHHMM: string, durationSec: number): string {
  const start = parseHHMM(startHHMM);
  if (!start || !Number.isFinite(durationSec) || durationSec <= 0) {
    return startHHMM;
  }

  const startMinutes = start.hours * 60 + start.minutes;
  const addMinutes = Math.round(durationSec / 60);
  const endMinutesRaw = startMinutes + addMinutes;
  const endOfDay = 23 * 60 + 59;
  const endMinutes = Math.min(endMinutesRaw, endOfDay);

  const hours = Math.floor(endMinutes / 60);
  const minutes = endMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function durationSecFromStartEnd(startHHMM: string, endHHMM: string): number | null {
  const start = parseHHMM(startHHMM);
  const end = parseHHMM(endHHMM);
  if (!start || !end) return null;
  const startMin = start.hours * 60 + start.minutes;
  const endMin = end.hours * 60 + end.minutes;
  if (endMin <= startMin) return null;
  return (endMin - startMin) * 60;
}

export function applyDurationToDraft(
  draft: { startTime: string },
  durationSec: number
): { endTime: string } {
  return { endTime: addDurationToStartTime(draft.startTime, durationSec) };
}
