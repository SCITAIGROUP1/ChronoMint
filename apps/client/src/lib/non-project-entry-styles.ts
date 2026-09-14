import {
  TIME_LOG_CLASSIFICATION_LABELS,
  isDayBlockClassification,
  isNonProjectClassification,
  type TimeLogClassification,
  type TimeLogDto
} from "@kloqra/contracts";
import { contrastTextOn, entryColorsFromProject } from "./project-color-styles";

export const NON_PROJECT_ENTRY_COLORS = {
  PUBLIC_HOLIDAY: "#d97706",
  LEAVE_FULL: "#6d28d9",
  LEAVE_HALF: "#7c3aed",
  TENANT_ACTIVITY: "#0d9488"
} as const;

export function colorForNonProjectLog(
  log: Pick<TimeLogDto, "classification" | "activityTypeId"> & {
    activityTypeColor?: string | null;
  }
): string {
  if (log.classification === "TENANT_ACTIVITY") {
    return log.activityTypeColor || NON_PROJECT_ENTRY_COLORS.TENANT_ACTIVITY;
  }
  if (log.classification === "PUBLIC_HOLIDAY") return NON_PROJECT_ENTRY_COLORS.PUBLIC_HOLIDAY;
  if (log.classification === "LEAVE_FULL") return NON_PROJECT_ENTRY_COLORS.LEAVE_FULL;
  if (log.classification === "LEAVE_HALF") return NON_PROJECT_ENTRY_COLORS.LEAVE_HALF;
  return NON_PROJECT_ENTRY_COLORS.TENANT_ACTIVITY;
}

export function entryColorsForLog(
  log: Pick<TimeLogDto, "classification" | "taskId"> & { activityTypeColor?: string | null },
  projectColor: string
): {
  backgroundColor: string;
  borderColor: string;
  color: string;
  backgroundImage?: string;
} {
  if (!isNonProjectClassification(log.classification)) {
    return entryColorsFromProject(projectColor);
  }
  const base = colorForNonProjectLog(log);
  return {
    backgroundColor: base,
    borderColor: base,
    color: contrastTextOn(base),
    ...(log.classification === "LEAVE_HALF"
      ? {
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent, transparent 5px, rgba(0,0,0,0.16) 5px, rgba(0,0,0,0.16) 7px)"
        }
      : {})
  };
}

export function calendarLogLabel(
  log: Pick<
    TimeLogDto,
    "classification" | "taskId" | "activityTypeName" | "holidayName" | "description"
  >,
  taskName: (taskId: string) => string
): string {
  if (log.taskId) return taskName(log.taskId);
  return (
    log.activityTypeName ||
    log.holidayName ||
    TIME_LOG_CLASSIFICATION_LABELS[log.classification ?? "PROJECT"]
  );
}

export function formatNonProjectHoursPreview(
  classification: TimeLogClassification,
  dayHours: number
): string | null {
  if (!isDayBlockClassification(classification)) return null;
  const hours = classification === "LEAVE_HALF" ? dayHours / 2 : dayHours;
  const rounded = Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/\.?0+$/, "");
  return classification === "LEAVE_HALF" ? `${rounded}h (half day)` : `${rounded}h (full day)`;
}
