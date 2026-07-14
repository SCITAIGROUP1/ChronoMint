import { dateFromKey, dateKeyFromDate, formatDateKeyLabel } from "@kloqra/ui";

/** Client-side preview for confirm dialogs — mirrors server `computeExtendedTrialEndsAt`. */
export function previewTrialEndsAtFromDays(
  currentTrialEndsAt: string | null | undefined,
  extendDays: number,
  now: Date = new Date()
): Date {
  const current = currentTrialEndsAt ? new Date(currentTrialEndsAt) : now;
  const base = current.getTime() > now.getTime() ? current : now;
  const result = new Date(base);
  result.setDate(result.getDate() + extendDays);
  return result;
}

/** Local calendar day from an API ISO timestamp (avoids UTC day-shift). */
export function isoToLocalDateKey(iso: string): string {
  return dateKeyFromDate(new Date(iso));
}

/** End of the local calendar day as ISO — pickers stay aligned with displayed dates. */
export function localDateKeyToEndOfDayIso(dateKey: string): string {
  const local = dateFromKey(dateKey);
  local.setHours(23, 59, 59, 999);
  return local.toISOString();
}

export function formatTrialEndLabel(iso: string | null | undefined): string {
  if (!iso) return "No trial end date";
  const end = new Date(iso);
  const label = formatDateKeyLabel(isoToLocalDateKey(iso));
  return `${end.getTime() < Date.now() ? "Expired" : "Ends"} ${label}`;
}
