"use client";

import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import {
  buildApprovalsListQueryString,
  mapApprovalsQueryData,
  useAllTimesheetsQuery
} from "@kloqra/web-shared";
import { useCallback } from "react";
import { toast } from "sonner";
import { useRegisterApprovalsRefresh } from "./use-approvals-refresh-registration";

export function useAllTimesheets(
  workspaceId: string,
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const filterKey = buildApprovalsListQueryString(filters);
  const { data, isLoading, refetch } = useAllTimesheetsQuery(workspaceId, filterKey, enabled);
  const mapped = mapApprovalsQueryData(data);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    try {
      await refetch();
    } catch {
      toast.error("Failed to load timesheet history");
    }
  }, [workspaceId, refetch]);

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
