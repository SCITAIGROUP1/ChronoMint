"use client";

import { ROUTES, type TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import {
  buildApprovalsCountQueryString,
  buildApprovalsListQueryString,
  invalidateWorkspaceQueries,
  mapApprovalsQueryData,
  usePendingTimesheetsQuery
} from "@kloqra/web-shared";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const POLL_MS = 60_000;

function shouldPollPendingApprovals(filterKey: string): boolean {
  if (!filterKey) return true;
  if (filterKey === buildApprovalsCountQueryString({})) return true;
  const params = new URLSearchParams(filterKey);
  return [...params.keys()].every((key) => key === "page" || key === "limit");
}

export function usePendingTimesheets(
  workspaceId: string,
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const filterKey = buildApprovalsListQueryString(filters);
  const { data, isLoading, refetch } = usePendingTimesheetsQuery(workspaceId, filterKey, enabled, {
    refetchInterval: shouldPollPendingApprovals(filterKey) ? POLL_MS : false
  });
  const mapped = mapApprovalsQueryData(data);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const invalidatePending = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleReview = useCallback(
    async (id: string, action: "approve" | "reject", reviewNote = "") => {
      if (!workspaceId) return;
      if (action === "reject" && !reviewNote.trim()) {
        toast.error("A rejection reason is required");
        return;
      }
      setActioningId(id);
      try {
        const endpoint =
          action === "approve" ? ROUTES.TIMESHEETS.APPROVE(id) : ROUTES.TIMESHEETS.REJECT(id);
        await api(endpoint, {
          method: "PATCH",
          workspaceId,
          body: JSON.stringify({ reviewNote })
        });
        toast.success(`Timesheet ${action === "approve" ? "approved" : "rejected"} successfully`);
        await invalidateWorkspaceQueries(workspaceId, ["pending_approvals", "submissions"]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to review timesheet");
      } finally {
        setActioningId(null);
      }
    },
    [workspaceId]
  );

  const handleBulkReview = useCallback(
    async (ids: string[], action: "approve" | "reject", reviewNote = "") => {
      if (!workspaceId) return;
      if (ids.length === 0) return;
      try {
        await api(ROUTES.TIMESHEETS.BULK_REVIEW, {
          method: "POST",
          workspaceId,
          body: JSON.stringify({ ids, action, reviewNote })
        });
        toast.success(
          `Bulk review job for ${ids.length} timesheets enqueued. Updates will process in the background.`
        );
        await invalidateWorkspaceQueries(workspaceId, ["pending_approvals", "submissions"]);
        await refetch();
        window.setTimeout(() => void refetch(), 3000);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to trigger bulk review");
      }
    },
    [workspaceId, refetch]
  );

  return {
    pending: mapped.items,
    loading: isLoading,
    actioningId,
    total: mapped.total,
    page: mapped.page,
    limit: mapped.limit,
    totalPages: mapped.totalPages,
    fetchPending: invalidatePending,
    handleReview,
    handleBulkReview,
    pendingCount: mapped.total
  };
}

export function usePendingTimesheetsBadgeCount(workspaceId: string, enabled = true) {
  const filterKey = buildApprovalsCountQueryString({});
  const { data } = usePendingTimesheetsQuery(workspaceId, filterKey, enabled, {
    refetchInterval: POLL_MS
  });
  return mapApprovalsQueryData(data).total;
}
