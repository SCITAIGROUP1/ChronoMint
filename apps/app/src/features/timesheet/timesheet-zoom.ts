/** Default slot height matches Tailwind `h-10` (40px per 30 minutes). */
export const DEFAULT_TIMESHEET_SLOT_PX = 40;

/** Discrete zoom steps for the day/week calendar grid. */
export const TIMESHEET_ZOOM_LEVELS = [24, 32, 40, 52, 64, 80] as const;

export type TimesheetSlotPx = (typeof TIMESHEET_ZOOM_LEVELS)[number];

export function isTimesheetSlotPx(value: number): value is TimesheetSlotPx {
  return (TIMESHEET_ZOOM_LEVELS as readonly number[]).includes(value);
}

export function parseTimesheetSlotPx(raw: string | null): TimesheetSlotPx | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && isTimesheetSlotPx(n) ? n : null;
}

export function zoomPercentLabel(slotPx: number): string {
  return `${Math.round((slotPx / DEFAULT_TIMESHEET_SLOT_PX) * 100)}%`;
}

export function zoomInSlotPx(current: number): TimesheetSlotPx {
  const idx = TIMESHEET_ZOOM_LEVELS.findIndex((level) => level > current);
  if (idx === -1) return TIMESHEET_ZOOM_LEVELS[TIMESHEET_ZOOM_LEVELS.length - 1]!;
  return TIMESHEET_ZOOM_LEVELS[idx]!;
}

export function zoomOutSlotPx(current: number): TimesheetSlotPx {
  for (let i = TIMESHEET_ZOOM_LEVELS.length - 1; i >= 0; i--) {
    const level = TIMESHEET_ZOOM_LEVELS[i]!;
    if (level < current) return level;
  }
  return TIMESHEET_ZOOM_LEVELS[0]!;
}

export function canZoomIn(slotPx: number): boolean {
  return slotPx < TIMESHEET_ZOOM_LEVELS[TIMESHEET_ZOOM_LEVELS.length - 1]!;
}

export function canZoomOut(slotPx: number): boolean {
  return slotPx > TIMESHEET_ZOOM_LEVELS[0]!;
}
