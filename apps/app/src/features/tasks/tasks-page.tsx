"use client";

import { ROUTES } from "@kloqra/contracts";
import type { ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  AppBar,
  Badge,
  DataTableCard,
  DataTableCell,
  DataTableHead,
  DataTableHeaderRow,
  SearchableSelect,
  Table,
  TableBody,
  TableHeader,
  TableLoadingState,
  TablePagination,
  TableRow,
  TableToolbar
} from "@kloqra/ui";
import { usePaginatedList, useProjectsListQuery } from "@kloqra/web-shared";
import { useMemo, useState } from "react";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

const ALL_PROJECTS = "__all__";

export function TasksPage({ managedProjectIds }: { managedProjectIds?: readonly string[] }) {
  const workspaceId =
    useSessionStore((state) => state.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { data: allProjects = [] } = useProjectsListQuery(workspaceId, Boolean(workspaceId));
  const projects = useMemo(() => {
    if (!managedProjectIds) return allProjects;
    const allowed = new Set(managedProjectIds);
    return allProjects.filter((project) => allowed.has(project.id));
  }, [allProjects, managedProjectIds]);
  const [projectFilter, setProjectFilter] = useState(ALL_PROJECTS);
  const filters = useMemo(
    () => (projectFilter === ALL_PROJECTS ? undefined : { projectId: projectFilter }),
    [projectFilter]
  );
  const { items, page, setPage, search, setSearch, total, totalPages, limit, setLimit, loading } =
    usePaginatedList<TaskDto>({
      workspaceId,
      basePath: ROUTES.TASKS.LIST,
      filters,
      refreshOnFocus: true,
      refreshOnStaleScopes: ["tasks"]
    });
  const projectsById = useMemo(
    () => new Map<string, ProjectDto>(projects.map((project) => [project.id, project])),
    [projects]
  );
  const visibleTasks = managedProjectIds
    ? items.filter((task) => projectsById.has(task.projectId))
    : items;

  return (
    <div className="space-y-6" data-testid="unified-tasks">
      <AppBar
        title="Tasks"
        description={
          managedProjectIds
            ? "Browse tasks in your managed projects."
            : "Browse the project tasks available to you."
        }
      />
      <DataTableCard>
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search tasks…"
          searchAriaLabel="Search tasks"
          filters={
            <div className="w-[220px]">
              <SearchableSelect
                value={projectFilter}
                onValueChange={setProjectFilter}
                options={[
                  { value: ALL_PROJECTS, label: "All projects" },
                  ...projects.map((project) => ({ value: project.id, label: project.name }))
                ]}
                placeholder="Filter by project"
                searchPlaceholder="Search projects…"
                aria-label="Filter by project"
              />
            </div>
          }
        />
        {loading ? (
          <TableLoadingState rows={6} columns={3} />
        ) : visibleTasks.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No tasks found for this filter.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>Task</DataTableHead>
                  <DataTableHead>Project</DataTableHead>
                  <DataTableHead>Billable default</DataTableHead>
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {visibleTasks.map((task) => (
                  <TableRow key={task.id}>
                    <DataTableCell className="font-medium">{task.taskName}</DataTableCell>
                    <DataTableCell>{projectsById.get(task.projectId)?.name ?? "—"}</DataTableCell>
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
    </div>
  );
}
