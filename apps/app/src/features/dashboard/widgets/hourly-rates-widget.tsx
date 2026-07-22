"use client";

import { ROUTES } from "@kloqra/contracts";
import type { HourlyRateDto } from "@kloqra/contracts";
import {
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  Table,
  TableBody,
  TableHeader,
  TablePagination,
  TableRow
} from "@kloqra/ui";
import {
  usePaginatedList,
  useProjectsListQuery,
  useWorkspaceMembersQuery
} from "@kloqra/web-shared";
import React, { useEffect, useMemo } from "react";
import { useSessionStore, getWorkspaceId } from "@/stores/session.store";

export type HourlyRatesWidgetProps = {
  projectId?: string | string[];
  userId?: string | string[];
};

const WIDGET_PAGE_SIZE = 5;

export function HourlyRatesWidget({ projectId, userId }: HourlyRatesWidgetProps) {
  const ws = useSessionStore((s) => s.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { data: projects = [] } = useProjectsListQuery(ws, Boolean(ws));

  const filters = useMemo(
    () => ({
      ...(projectId
        ? { projectId: Array.isArray(projectId) ? projectId.join(",") : projectId }
        : {}),
      ...(userId ? { userId: Array.isArray(userId) ? userId.join(",") : userId } : {})
    }),
    [projectId, userId]
  );

  const {
    items: rates,
    page,
    setPage,
    total,
    totalPages,
    limit,
    setLimit,
    loading,
    error
  } = usePaginatedList<HourlyRateDto>({
    workspaceId: ws,
    basePath: ROUTES.BILLING.RATES,
    filters,
    enabled: Boolean(ws),
    refreshOnStaleScopes: ["projects"]
  });

  const { data: members = [] } = useWorkspaceMembersQuery(ws, Boolean(ws));

  useEffect(() => {
    setLimit(WIDGET_PAGE_SIZE);
    setPage(1);
  }, [projectId, userId, setLimit, setPage]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-6 text-sm text-muted-foreground animate-pulse">
        Loading hourly rates...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center py-6 text-sm font-medium text-destructive">
        {error}
      </div>
    );
  }

  function getScopeLabel(rate: HourlyRateDto) {
    if (rate.userId) {
      const member = members.find((m) => m.userId === rate.userId);
      return `Member: ${member?.userName ?? "Unknown Member"}`;
    }
    if (rate.projectId) {
      const project = projects.find((p) => p.id === rate.projectId);
      return `Project: ${project?.name ?? "Unknown Project"}`;
    }
    return "Global Default";
  }

  function formatDate(isoStr: string) {
    return new Date(isoStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  return (
    <div className="flex h-full max-h-[220px] flex-col pr-1">
      {rates.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No hourly rates configured.
        </p>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="text-xs">
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead className="h-9 px-3">Scope</DataTableHead>
                  <DataTableHead className="h-9 px-3 text-right">Rate</DataTableHead>
                  <DataTableHead className="h-9 px-3 text-right">Effective</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <DataTableCell className="px-3 py-2 text-xs font-medium">
                      {getScopeLabel(r)}
                    </DataTableCell>
                    <DataTableCell className="px-3 py-2 text-right font-mono text-xs font-bold">
                      ${r.rate.toFixed(2)}/hr
                    </DataTableCell>
                    <DataTableCell className="px-3 py-2 text-right font-mono text-[10px] text-muted-foreground">
                      {formatDate(r.effectiveFrom)}
                    </DataTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 ? (
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
              disabled={loading}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

export default HourlyRatesWidget;
