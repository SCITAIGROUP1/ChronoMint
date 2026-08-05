"use client";

import { ROUTES } from "@kloqra/contracts";
import type { TaskDto } from "@kloqra/contracts";
import {
  Badge,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  EmptyState,
  entityRowClassName,
  Table,
  TableBody,
  TableHeader,
  TableLoadingState,
  TablePagination,
  TableRow
} from "@kloqra/ui";
import { usePaginatedList } from "@kloqra/web-shared";
import { useMemo } from "react";
import { useProjectDetail } from "./project-detail-context";

export function PersonalProjectTasksTab() {
  const { workspaceId, projectId } = useProjectDetail();
  const filters = useMemo(() => ({ projectId }), [projectId]);
  const { items, page, setPage, total, totalPages, limit, setLimit, loading } =
    usePaginatedList<TaskDto>({
      workspaceId,
      basePath: ROUTES.TASKS.LIST,
      filters,
      refreshOnFocus: true,
      refreshOnStaleScopes: ["tasks"]
    });

  if (!loading && items.length === 0) {
    return (
      <EmptyState
        title="No assigned tasks"
        description="Ask a project manager to assign you to tasks before logging time."
      />
    );
  }

  return (
    <DataTableCard data-testid="personal-project-tasks">
      {loading ? (
        <TableLoadingState rows={6} columns={3} />
      ) : (
        <>
          <Table>
            <TableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Task</DataTableHead>
                <DataTableHead>Category</DataTableHead>
                <DataTableHead>Billable</DataTableHead>
              </DataTableHeaderRow>
            </TableHeader>
            <TableBody>
              {items.map((task) => (
                <TableRow key={task.id} className={entityRowClassName(task.isActive)}>
                  <DataTableCell className="font-medium">{task.taskName}</DataTableCell>
                  <DataTableCell>{task.categoryName ?? "Other"}</DataTableCell>
                  <DataTableCell>
                    <Badge variant={task.billableDefault ? "default" : "secondary"}>
                      {task.billableDefault ? "Billable" : "Non-billable"}
                    </Badge>
                  </DataTableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
            disabled={loading}
          />
        </>
      )}
    </DataTableCard>
  );
}
