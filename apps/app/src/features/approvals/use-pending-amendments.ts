"use client";

import { ROUTES } from "@kloqra/contracts";
import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import {
  buildApprovalsListQueryString,
  invalidateWorkspaceQueries,
  mapApprovalsQueryData,
  usePendingAmendmentsQuery
} from "@kloqra/web-shared";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useRegisterApprovalsRefresh } from "./use-approvals-refresh-registration";
import { api } from "@/lib/api";

export function usePendingAmendments(
  workspaceId: string,
  filters: TimesheetApprovalsFilterQuery,
  enabled = true
) {
  const filterKey = buildApprovalsListQueryString(filters);
  const { data, isLoading, refetch } = usePendingAmendmentsQuery(workspaceId, filterKey, enabled);
  const mapped = mapApprovalsQueryData(data);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    try {
      await refetch();
    } catch {
      toast.error("Failed to load amendment requests");
    }
  }, [workspaceId, refetch]);

  useRegisterApprovalsRefresh(refresh);

  const handleReview = useCallback(
    async (id: string, action: "approve" | "deny", adminNote = "") => {
      if (!workspaceId) return;
      setActioningId(id);
      try {
        const endpoint =
          action === "approve"
            ? ROUTES.TIMESHEETS.APPROVE_AMENDMENT(id)
            : ROUTES.TIMESHEETS.DENY_AMENDMENT(id);
        await api(endpoint, {
          method: "PATCH",
          workspaceId,
          body: JSON.stringify({ adminNote: adminNote || undefined })
        });
        toast.success(
          action === "approve" ? "Edit request approved — period unlocked" : "Edit request denied"
        );
        await invalidateWorkspaceQueries(workspaceId, ["pending_approvals", "submissions"]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to review amendment");
      } finally {
        setActioningId(null);
      }
    },
    [workspaceId]
  );

  return {
    amendments: mapped.items,
    loading: isLoading,
    actioningId,
    total: mapped.total,
    page: mapped.page,
    limit: mapped.limit,
    totalPages: mapped.totalPages,
    refresh,
    handleReview,
    amendmentCount: mapped.total
  };
}
