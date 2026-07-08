"use client";

import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import {
  buildApprovalsListQueryString,
  mapApprovalsQueryData,
  useReviewedTimesheetsQuery
} from "@kloqra/web-shared";
import { useCallback } from "react";
import { toast } from "sonner";
import { useRegisterApprovalsRefresh } from "./use-approvals-refresh-registration";

export function useReviewedTimesheets(
  workspaceId: string,
  status: "APPROVED" | "REJECTED",
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const filterKey = buildApprovalsListQueryString(filters);
  const { data, isLoading, refetch } = useReviewedTimesheetsQuery(
    workspaceId,
    status,
    filterKey,
    enabled
  );
  const mapped = mapApprovalsQueryData(data);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    try {
      await refetch();
    } catch {
      toast.error(`Failed to load ${status === "APPROVED" ? "approved" : "rejected"} timesheets`);
    }
  }, [workspaceId, refetch, status]);

  useRegisterApprovalsRefresh(refresh);

  return {
    items: mapped.items,
    loading: isLoading,
    refresh,
    total: mapped.total,
    page: mapped.page,
    limit: mapped.limit,
    totalPages: mapped.totalPages,
    count: mapped.items.length
  };
}
