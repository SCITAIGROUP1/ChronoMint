"use client";

import { ROUTES } from "@kloqra/contracts";
import type {
  ListReviewedTimesheetsResponseDto,
  ReviewedTimesheetDto,
  TimesheetApprovalsFilterQuery
} from "@kloqra/contracts";
import { buildApprovalsListQueryString } from "@kloqra/web-shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRegisterApprovalsRefresh } from "./use-approvals-refresh-registration";
import { api } from "@/lib/api";

export function useAllTimesheets(
  workspaceId: string,
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const [items, setItems] = useState<ReviewedTimesheetDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(0);

  const filterKey = buildApprovalsListQueryString(filters);
  const route = ROUTES.TIMESHEETS.LIST_ALL;

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const path = filterKey ? `${route}?${filterKey}` : route;
      const res = await api<ListReviewedTimesheetsResponseDto>(path, { workspaceId });
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
      setPage(res.page ?? 1);
      setLimit(res.limit ?? 25);
      setTotalPages(res.totalPages ?? 0);
    } catch {
      toast.error("Failed to load timesheet history");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filterKey, route]);

  useEffect(() => {
    if (enabled && workspaceId) {
      void refresh();
    }
  }, [enabled, workspaceId, refresh]);

  useRegisterApprovalsRefresh(refresh);

  return { items, loading, refresh, total, page, limit, totalPages, count: items.length };
}
