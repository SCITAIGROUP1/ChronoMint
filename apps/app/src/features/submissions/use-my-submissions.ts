"use client";

import type { TimesheetPeriodDto } from "@kloqra/contracts";
import { isOpenTimesheetPeriod } from "@kloqra/ui";
import { normalizeSubmissionDateKey } from "@kloqra/web-shared";

export type SubmissionsScope = "logged" | "assigned";

export function isDueSubmissionAction(submission: TimesheetPeriodDto, now = new Date()): boolean {
  if (submission.status === "REJECTED") return true;
  if (submission.status !== "DRAFT") return false;
  return !isOpenTimesheetPeriod(submission.periodEnd, now);
}

export function countDueSubmissions(submissions: TimesheetPeriodDto[], now = new Date()): number {
  return submissions.filter((s) => isDueSubmissionAction(s, now)).length;
}

export function countActionableSubmissions(submissions: TimesheetPeriodDto[]): number {
  return submissions.filter((s) => s.status === "DRAFT" || s.status === "REJECTED").length;
}

export function countOpenDraftSubmissions(
  submissions: TimesheetPeriodDto[],
  now = new Date()
): number {
  return submissions.filter((s) => s.status === "DRAFT" && isOpenTimesheetPeriod(s.periodEnd, now))
    .length;
}

export function openDraftsNotice(
  submissions: TimesheetPeriodDto[],
  now = new Date()
): string | null {
  const open = submissions.filter(
    (s) => s.status === "DRAFT" && isOpenTimesheetPeriod(s.periodEnd, now)
  );
  if (open.length === 0) return null;
  const periods = new Set(open.map((row) => row.approvalPeriod));
  let unit = open.length === 1 ? "period" : "periods";
  if (periods.size === 1) {
    if (periods.has("daily")) unit = open.length === 1 ? "day" : "days";
    else if (periods.has("monthly")) unit = open.length === 1 ? "month" : "months";
    else unit = open.length === 1 ? "week" : "weeks";
  }
  const noun = open.length === 1 ? `This ${unit}` : `${open.length} ${unit}`;
  return `${noun} ${open.length === 1 ? "is" : "are"} still in progress. Submitting now is optional — remaining hours will lock until review.`;
}

export function countPendingReviewSubmissions(submissions: TimesheetPeriodDto[]): number {
  return submissions.filter((s) => s.status === "SUBMITTED").length;
}

export function countAmendmentPendingSubmissions(submissions: TimesheetPeriodDto[]): number {
  return submissions.filter((s) => s.amendmentPending).length;
}

export type MemberSubmissionsTabFilter = "action" | "pending" | "approved" | "rejected" | "all";

export function filterSubmissionsByTab(
  submissions: TimesheetPeriodDto[],
  tab: MemberSubmissionsTabFilter
): TimesheetPeriodDto[] {
  switch (tab) {
    case "action":
      return submissions.filter((s) => s.status === "DRAFT" || s.status === "REJECTED");
    case "pending":
      return submissions.filter((s) => s.status === "SUBMITTED");
    case "approved":
      return submissions.filter((s) => s.status === "APPROVED");
    case "rejected":
      return submissions.filter((s) => s.status === "REJECTED");
    case "all":
    default:
      return submissions;
  }
}

/** Keep rows whose period start falls within an inclusive YYYY-MM-DD range. */
export function filterSubmissionsByPeriodRange(
  submissions: TimesheetPeriodDto[],
  from: string,
  to: string,
  timezone?: string
): TimesheetPeriodDto[] {
  if (!from && !to) return submissions;
  return submissions.filter((row) => {
    const periodKey = normalizeSubmissionDateKey(row.periodStart, timezone);
    if (from && periodKey < from) return false;
    if (to && periodKey > to) return false;
    return true;
  });
}
