import type { ListTimeLogOccupancyResponseDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import {
  findOccupancyConflict,
  formatOverlapError,
  occupancyConflictLabel
} from "./calendar-utils";
import { api } from "@/lib/api";

export type OccupancyItem = ListTimeLogOccupancyResponseDto["items"][number];

export function overlapMessageFromItems(
  items: OccupancyItem[],
  start: Date,
  end: Date,
  timezone: string,
  excludeLogId?: string
): string | null {
  const conflict = findOccupancyConflict(items, start, end, excludeLogId);
  if (!conflict) return null;
  return formatOverlapError(
    occupancyConflictLabel(conflict),
    new Date(conflict.startTime),
    new Date(conflict.endTime),
    timezone
  );
}

/** Shorter in-dialog copy so overlap is obvious before save. */
export function timeEntryOverlapNotice(
  items: OccupancyItem[],
  start: Date,
  end: Date,
  timezone: string,
  excludeLogId?: string
): string | null {
  const conflict = findOccupancyConflict(items, start, end, excludeLogId);
  if (!conflict) return null;
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone
  };
  const range = `${new Date(conflict.startTime).toLocaleTimeString(undefined, timeOpts)} – ${new Date(conflict.endTime).toLocaleTimeString(undefined, timeOpts)}`;
  return `This time overlaps an existing entry (${occupancyConflictLabel(conflict)}, ${range}). Change the date or time to save.`;
}

export async function validateTimeEntryOverlap(
  workspaceId: string,
  start: Date,
  end: Date,
  timezone: string,
  excludeLogId?: string
): Promise<string | null> {
  const params = new URLSearchParams({
    from: start.toISOString(),
    to: end.toISOString()
  });
  const res = await api<ListTimeLogOccupancyResponseDto>(`${ROUTES.TIMELOGS.OCCUPANCY}?${params}`, {
    workspaceId
  });
  return overlapMessageFromItems(res.items, start, end, timezone, excludeLogId);
}
