"use client";

import type { TimesheetPeriodDto } from "@kloqra/contracts";
import { useMySubmissionsQuery } from "@kloqra/web-shared";
import { useCallback, useMemo } from "react";
import { buildSubmissionsPath } from "@/lib/submissions-path";

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
  to: string
): TimesheetPeriodDto[] {
  if (!from && !to) return submissions;
  return submissions.filter((row) => {
    const periodKey = row.periodStart.slice(0, 10);
    if (from && periodKey < from) return false;
    if (to && periodKey > to) return false;
    return true;
  });
}

function buildScopedQueryKey(anchorDate: Date, scope: SubmissionsScope) {
  // Day-granular key — full ISO would remount queries whenever the caller passed a fresh Date.
  return `date=${anchorDate.toISOString().slice(0, 10)}&scope=${scope}`;
}

function buildScopedPath(anchorDate: Date, scope: SubmissionsScope) {
  const params = new URLSearchParams({
    date: anchorDate.toISOString().slice(0, 10),
    scope
  });
  return buildSubmissionsPath(params);
}

export function useMySubmissions(
  workspaceId: string,
  anchorDate: Date,
  scope: SubmissionsScope = "assigned",
  enabled = true
) {
  const queryKey = buildScopedQueryKey(anchorDate, scope);
  const path = buildScopedPath(anchorDate, scope);
  const { data, isLoading, refetch } = useMySubmissionsQuery(workspaceId, path, queryKey, enabled);

  const submissions = data ?? [];
  const actionableCount = useMemo(() => countActionableSubmissions(submissions), [submissions]);
  const pendingReviewCount = useMemo(
    () => countPendingReviewSubmissions(submissions),
    [submissions]
  );
  const amendmentPendingCount = useMemo(
    () => countAmendmentPendingSubmissions(submissions),
    [submissions]
  );

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    submissions,
    loading: isLoading,
    refresh,
    actionableCount,
    pendingReviewCount,
    amendmentPendingCount
  };
}

export function useMySubmissionsBadgeCount(
  workspaceId: string,
  anchorDate: Date,
  scope: SubmissionsScope = "assigned",
  enabled = true
) {
  const { submissions } = useMySubmissions(workspaceId, anchorDate, scope, enabled);
  return useMemo(() => countActionableSubmissions(submissions), [submissions]);
}

export function useDashboardSubmissions(workspaceId: string, enabled = true) {
  const queryKey = "all";
  const path = buildSubmissionsPath();
  const { data, isLoading, refetch } = useMySubmissionsQuery(workspaceId, path, queryKey, enabled);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return { submissions: data ?? [], loading: isLoading, refresh };
}
