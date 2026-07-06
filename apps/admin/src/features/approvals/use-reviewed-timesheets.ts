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

export function useReviewedTimesheets(
  workspaceId: string,
  status: "APPROVED" | "REJECTED",
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
  const route =
    status === "APPROVED" ? ROUTES.TIMESHEETS.LIST_APPROVED : ROUTES.TIMESHEETS.LIST_REJECTED;

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
      toast.error(`Failed to load ${status === "APPROVED" ? "approved" : "rejected"} timesheets`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filterKey, route, status]);

  useEffect(() => {
    if (enabled && workspaceId) {
      void refresh();
    }
  }, [enabled, workspaceId, refresh]);

  useRegisterApprovalsRefresh(refresh);

  return { items, loading, refresh, total, page, limit, totalPages, count: items.length };
}
