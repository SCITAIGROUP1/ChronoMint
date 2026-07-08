"use client";

import type { TimesheetPeriodDto } from "@kloqra/contracts";
import { normalizeSubmissionDateKey } from "@kloqra/web-shared";

export type SubmissionsScope = "logged" | "assigned";

export function countActionableSubmissions(submissions: TimesheetPeriodDto[]): number {
  return submissions.filter((s) => s.status === "DRAFT" || s.status === "REJECTED").length;
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
