"use client";

import { ROUTES, type TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import { buildApprovalsCountQueryString, buildApprovalsListQueryString } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  usePendingTimesheetsListKey,
  usePendingTimesheetsStore,
  EMPTY_PENDING_TIMESHEETS
} from "@/stores/pending-timesheets.store";

export function usePendingTimesheets(
  workspaceId: string,
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const filterKey = buildApprovalsListQueryString(filters);
  const listKey = usePendingTimesheetsListKey(workspaceId, filters);
  const entry = usePendingTimesheetsStore((s) => s.byKey[listKey]);
  const pending = entry?.items ?? EMPTY_PENDING_TIMESHEETS;
  const loading = entry?.loading ?? false;
  const total = entry?.total ?? 0;
  const page = entry?.page ?? 1;
  const limit = entry?.limit ?? 25;
  const totalPages = entry?.totalPages ?? 0;

  const subscribe = usePendingTimesheetsStore((s) => s.subscribe);
  const fetchPending = usePendingTimesheetsStore((s) => s.fetchPending);
  const removeItem = usePendingTimesheetsStore((s) => s.removeItem);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribe(workspaceId, filterKey);
  }, [enabled, workspaceId, filterKey, subscribe]);

  const refreshPending = useCallback(async () => {
    if (!workspaceId) return;
    await fetchPending(workspaceId, filterKey);
  }, [workspaceId, filterKey, fetchPending]);

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
        removeItem(workspaceId, filterKey, id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to review timesheet");
      } finally {
        setActioningId(null);
      }
    },
    [workspaceId, filterKey, removeItem]
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
        for (const id of ids) {
          removeItem(workspaceId, filterKey, id);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to trigger bulk review");
      }
    },
    [workspaceId, filterKey, removeItem]
  );

  return {
    pending,
    loading,
    actioningId,
    total,
    page,
    limit,
    totalPages,
    fetchPending: refreshPending,
    handleReview,
    handleBulkReview,
    pendingCount: total
  };
}

export function usePendingTimesheetsBadgeCount(workspaceId: string, enabled = true) {
  const filterKey = buildApprovalsCountQueryString({});
  const listKey = `${workspaceId}:${filterKey}`;
  const subscribe = usePendingTimesheetsStore((s) => s.subscribe);
  const count = usePendingTimesheetsStore((s) => s.byKey[listKey]?.total ?? 0);

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    return subscribe(workspaceId, filterKey);
  }, [enabled, workspaceId, filterKey, subscribe]);

  return count;
}
