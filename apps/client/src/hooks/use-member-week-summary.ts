"use client";

import { useWeekSummaryQuery } from "@kloqra/web-shared";
import { useCallback } from "react";

export function useMemberWeekSummary(workspaceId: string, enabled = true) {
  const { data, isLoading, refetch } = useWeekSummaryQuery(workspaceId, enabled);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    summary: data ?? null,
    loading: isLoading,
    refresh
  };
}
