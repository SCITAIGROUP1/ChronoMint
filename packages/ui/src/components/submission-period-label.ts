import type { TimesheetApprovalPeriod } from "@kloqra/contracts";

export function isOpenTimesheetPeriod(periodEndIso: string, now = new Date()): boolean {
  const end = new Date(periodEndIso);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > now.getTime();
}

function partsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short"
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    month: get("month"),
    day: get("day"),
    year: get("year")
  };
}

export function formatSubmissionPeriodLabel(
  periodStartIso: string,
  approvalPeriod: TimesheetApprovalPeriod,
  timezone = "UTC",
  periodEndIso?: string
): string {
  const start = new Date(periodStartIso);
  if (approvalPeriod === "daily") {
    const parts = partsInZone(start, timezone);
    return `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year}`;
  }
  if (approvalPeriod === "monthly") {
    return start.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: timezone
    });
  }
  const startParts = partsInZone(start, timezone);
  if (!periodEndIso) {
    return `Week of ${startParts.month} ${startParts.day}, ${startParts.year}`;
  }
  const endParts = partsInZone(new Date(periodEndIso), timezone);
  if (startParts.year === endParts.year) {
    return `${startParts.month} ${startParts.day} – ${endParts.month} ${endParts.day}, ${endParts.year}`;
  }
  return `${startParts.month} ${startParts.day}, ${startParts.year} – ${endParts.month} ${endParts.day}, ${endParts.year}`;
}

export function formatSubmissionPeriodEndLabel(periodEndIso: string, timezone = "UTC"): string {
  const parts = partsInZone(new Date(periodEndIso), timezone);
  return `${parts.weekday}, ${parts.month} ${parts.day}`;
}

export function openTimesheetPeriodCaption(periodEndIso: string, timezone = "UTC"): string {
  return `In progress · ends ${formatSubmissionPeriodEndLabel(periodEndIso, timezone)}`;
}

export function openTimesheetPeriodHint(
  approvalPeriod: TimesheetApprovalPeriod,
  periodEndIso: string,
  timezone = "UTC"
): string {
  const endLabel = formatSubmissionPeriodEndLabel(periodEndIso, timezone);
  if (approvalPeriod === "daily") {
    return `This day is still in progress (ends ${endLabel}). You can submit early — later entries today will lock.`;
  }
  if (approvalPeriod === "monthly") {
    return `This month is still in progress (ends ${endLabel}). You can submit early — later entries this month will lock.`;
  }
  return `This week is still in progress (ends ${endLabel}). You can submit early — later entries this week will lock.`;
}

export function earlySubmitDialogCopy(approvalPeriod: TimesheetApprovalPeriod): {
  title: string;
  description: string;
  confirm: string;
} {
  const unit = approvalPeriod === "daily" ? "day" : approvalPeriod === "monthly" ? "month" : "week";
  return {
    title: `Submit this ${unit} early?`,
    description: `This ${unit} has not ended yet. After you submit, you cannot add or edit entries in this period until it is reviewed or unlocked.`,
    confirm: "Submit early"
  };
}
