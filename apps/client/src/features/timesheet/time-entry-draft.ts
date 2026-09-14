import type { TaskDto, TimeLogClassification, TimeLogDto, HalfDaySlot } from "@kloqra/contracts";
import {
  isDayBlockClassification,
  nonProjectDurationSec,
  TIME_LOG_CLASSIFICATION_LABELS
} from "@kloqra/contracts";
import {
  combineDayAndTimeInZone,
  timeFromSlotIndex,
  toDateKey,
  toDateKeyInZone,
  toTimeValueInZone
} from "./calendar-utils";
import { addDurationToStartTime } from "./parse-duration-input";

export type TimeEntryDraft = {
  classification?: TimeLogClassification;
  projectId: string;
  taskSelection: string;
  activityTypeId?: string;
  holidayId?: string;
  halfDaySlot?: HalfDaySlot;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  isBillable: boolean;
  recurrence?: "none" | "daily" | "weekdays" | "weekly";
  repeatUntil?: string;
};

export function draftClassification(draft: TimeEntryDraft): TimeLogClassification {
  return draft.classification ?? "PROJECT";
}

export function suggestBillableFromTask(tasks: TaskDto[], taskSelection: string): boolean {
  if (!taskSelection) return true;
  return tasks.find((t) => t.id === taskSelection)?.billableDefault ?? true;
}

export function canSaveTaskDraft(draft: TimeEntryDraft): boolean {
  const classification = draftClassification(draft);
  if (isDayBlockClassification(classification)) return true;
  if (classification === "TENANT_ACTIVITY") return Boolean(draft.activityTypeId);
  if (!draft.projectId) return false;
  return Boolean(draft.taskSelection);
}

export function taskSaveHint(draft: TimeEntryDraft): string | null {
  const classification = draftClassification(draft);
  if (classification === "TENANT_ACTIVITY" && !draft.activityTypeId) {
    return "Select an organization activity type to enable Save.";
  }
  if (classification !== "PROJECT") return null;
  if (!draft.projectId) return null;
  if (!draft.taskSelection) {
    return "Select a task for this project to enable Save.";
  }
  return null;
}

export function applyClassificationToDraft(
  draft: TimeEntryDraft,
  classification: TimeLogClassification,
  dayHours: number,
  activityTypeId?: string
): TimeEntryDraft {
  const next: TimeEntryDraft = {
    ...draft,
    classification,
    isBillable: classification === "PROJECT" ? draft.isBillable : false
  };
  if (classification === "PROJECT") {
    return { ...next, halfDaySlot: undefined, activityTypeId: "", holidayId: "" };
  }
  if (classification === "TENANT_ACTIVITY") {
    return {
      ...next,
      halfDaySlot: undefined,
      projectId: "",
      taskSelection: "",
      activityTypeId: activityTypeId ?? draft.activityTypeId ?? "",
      holidayId: ""
    };
  }
  const slot = classification === "LEAVE_HALF" ? (draft.halfDaySlot ?? "AM") : undefined;
  const durationSec = nonProjectDurationSec(classification, dayHours);
  const startTime = slot === "PM" ? addDurationToStartTime("09:00", durationSec) : "09:00";
  return {
    ...next,
    halfDaySlot: slot,
    projectId: "",
    taskSelection: "",
    activityTypeId: "",
    holidayId: classification === "PUBLIC_HOLIDAY" ? (draft.holidayId ?? "") : "",
    startTime,
    endTime: addDurationToStartTime(startTime, durationSec)
  };
}

export const ENTRY_TYPE_OPTIONS: { value: TimeLogClassification; label: string }[] = (
  Object.keys(TIME_LOG_CLASSIFICATION_LABELS) as TimeLogClassification[]
).map((value) => ({ value, label: TIME_LOG_CLASSIFICATION_LABELS[value] }));

export const NON_PROJECT_ENTRY_TYPE_OPTIONS = ENTRY_TYPE_OPTIONS.filter(
  (option) => option.value !== "PROJECT"
);

export function draftToIsoRange(
  draft: TimeEntryDraft,
  timezone: string = "UTC"
): { startTime: string; endTime: string } {
  const start = combineDayAndTimeInZone(draft.date, draft.startTime, timezone);
  const end = combineDayAndTimeInZone(draft.date, draft.endTime, timezone);
  return { startTime: start.toISOString(), endTime: end.toISOString() };
}

export function draftFromSlot(
  day: Date,
  hour: number,
  minute: number,
  _timezone: string = "UTC",
  endHour?: number,
  endMinute?: number
): TimeEntryDraft {
  const pad = (n: number) => String(n).padStart(2, "0");
  let endH = hour;
  let endM = minute + 30;
  if (endHour !== undefined && endMinute !== undefined) {
    endH = endHour;
    endM = endMinute;
  } else {
    if (endM >= 60) {
      endH += 1;
      endM = 0;
    }
  }
  return {
    projectId: "",
    taskSelection: "",
    classification: "PROJECT",
    activityTypeId: "",
    holidayId: "",
    halfDaySlot: "AM",
    date: toDateKey(day),
    startTime: `${pad(hour)}:${pad(minute)}`,
    endTime: `${pad(endH)}:${pad(endM)}`,
    description: "",
    isBillable: true,
    recurrence: "none",
    repeatUntil: toDateKey(day)
  };
}

export function draftFromSlotRange(
  day: Date,
  startIndex: number,
  endIndex: number,
  _timezone: string = "UTC"
): TimeEntryDraft {
  const startSlot = timeFromSlotIndex(Math.min(startIndex, endIndex));
  const endSlot = timeFromSlotIndex(Math.max(startIndex, endIndex));
  const endMinute = endSlot.minute + 30;
  const endHour = endMinute >= 60 ? endSlot.hour + 1 : endSlot.hour;
  const normalizedEndMinute = endMinute >= 60 ? 0 : endMinute;
  return draftFromSlot(
    day,
    startSlot.hour,
    startSlot.minute,
    _timezone,
    endHour,
    normalizedEndMinute
  );
}

export function estimateRecurrenceCount(
  startDate: string,
  endDate: string,
  recurrence: "daily" | "weekdays" | "weekly"
): number {
  if (!startDate || !endDate || startDate > endDate) return 0;

  let count = 0;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const startDayOfWeek = start.getUTCDay();

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (recurrence === "weekdays") {
      const dayOfWeek = d.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    } else if (recurrence === "weekly") {
      if (d.getUTCDay() !== startDayOfWeek) continue;
    }
    count++;
  }
  return count;
}

export function draftFromLog(
  log: TimeLogDto,
  tasks: TaskDto[],
  timezone: string = "UTC"
): TimeEntryDraft {
  const start = new Date(log.startTime);
  const end = new Date(log.endTime);
  const task = log.taskId ? tasks.find((t) => t.id === log.taskId) : undefined;
  const classification = log.classification ?? "PROJECT";
  return {
    classification,
    projectId: task?.projectId ?? "",
    taskSelection: log.taskId ?? "",
    activityTypeId: log.activityTypeId ?? "",
    holidayId: log.holidayId ?? "",
    halfDaySlot: classification === "LEAVE_HALF" ? "AM" : undefined,
    date: toDateKeyInZone(start, timezone),
    startTime: toTimeValueInZone(start, timezone),
    endTime: toTimeValueInZone(end, timezone),
    description: log.description ?? "",
    isBillable: log.isBillable,
    recurrence: "none",
    repeatUntil: toDateKeyInZone(start, timezone)
  };
}

export function draftToTimelogBody(draft: TimeEntryDraft, timezone: string) {
  const classification = draftClassification(draft);
  const { startTime, endTime } = draftToIsoRange(draft, timezone);
  if (classification === "PROJECT") {
    return {
      classification,
      taskId: draft.taskSelection,
      activityTypeId: null,
      holidayId: null,
      startTime,
      endTime,
      description: draft.description || undefined,
      isBillable: draft.isBillable
    };
  }
  return {
    classification,
    taskId: null,
    activityTypeId: classification === "TENANT_ACTIVITY" ? draft.activityTypeId || null : null,
    holidayId: classification === "PUBLIC_HOLIDAY" ? draft.holidayId || null : null,
    halfDaySlot: draft.halfDaySlot,
    startTime,
    endTime,
    description: draft.description || undefined,
    isBillable: false as const
  };
}

export function draftToBatchBody(draft: TimeEntryDraft, timezone: string) {
  const classification = draftClassification(draft);
  return {
    classification,
    taskId: classification === "PROJECT" ? draft.taskSelection : undefined,
    activityTypeId: draft.activityTypeId || undefined,
    holidayId: draft.holidayId || undefined,
    halfDaySlot: draft.halfDaySlot,
    localStartTime: draft.startTime,
    localEndTime: draft.endTime,
    startDate: draft.date,
    endDate: draft.repeatUntil ?? draft.date,
    recurrence: draft.recurrence as "daily" | "weekdays" | "weekly",
    timezone,
    description: draft.description || undefined,
    isBillable: classification === "PROJECT" ? draft.isBillable : false
  };
}
