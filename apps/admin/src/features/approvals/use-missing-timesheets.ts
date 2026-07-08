"use client";

import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import {
  buildApprovalsListQueryString,
  mapApprovalsQueryData,
  useMissingTimesheetsQuery
} from "@kloqra/web-shared";
import { useCallback } from "react";
import { toast } from "sonner";
import { useRegisterApprovalsRefresh } from "./use-approvals-refresh-registration";

export function useMissingTimesheets(
  workspaceId: string,
  anchorDate: Date,
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const filterKey = buildApprovalsListQueryString(filters);
  const { data, isLoading, refetch } = useMissingTimesheetsQuery(
    workspaceId,
    anchorDate,
    filterKey,
    enabled
  );
  const mapped = mapApprovalsQueryData(data);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    try {
      await refetch();
    } catch {
      toast.error("Failed to load missing submissions");
    }
  }, [workspaceId, refetch]);

  useRegisterApprovalsRefresh(refresh);

  return {
    missing: mapped.items,
    loading: isLoading,
    refresh,
    total: mapped.total,
    page: mapped.page,
    limit: mapped.limit,
    totalPages: mapped.totalPages,
    missingCount: mapped.items.length
  };
}
