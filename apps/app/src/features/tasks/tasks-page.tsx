"use client";

import { ROUTES } from "@kloqra/contracts";
import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  AppBar,
  Badge,
  Button,
  ConfirmDialog,
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
  TableToolbar,
  entityRowClassName
} from "@kloqra/ui";
import { useCategoriesListQuery, usePaginatedList, useProjectsListQuery } from "@kloqra/web-shared";
import { Download, ExternalLink, Lock, Pencil, Plus, Trash2, Unlock, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TaskFormDialog } from "./task-form-dialog";
import { TasksImportModal } from "./tasks-import-modal";
import { getTaskConfirmCopy } from "@/features/projects/task-confirmation";
import { api } from "@/lib/api";
import { apiDownloadGet, saveDownloadResponse } from "@/lib/download";
import { getWorkspaceId, useSessionStore } from "@/stores/session.store";

const ALL_PROJECTS = "__all__";

type PendingTaskConfirm = {
  action: "activate" | "deactivate" | "delete";
  task: TaskDto;
};

export function TasksPage({
  managedProjectIds,
  canManage = false
}: {
  managedProjectIds?: readonly string[];
  canManage?: boolean;
}) {
  const workspaceId =
    useSessionStore((state) => state.session?.workspaceId) ?? getWorkspaceId() ?? "";
  const { data: allProjects = [] } = useProjectsListQuery(workspaceId, Boolean(workspaceId));
  const { data: categories = [] } = useCategoriesListQuery(workspaceId, Boolean(workspaceId));
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
  const {
    items,
    page,
    setPage,
    search,
    setSearch,
    total,
    totalPages,
    limit,
    setLimit,
    loading,
    reload
  } = usePaginatedList<TaskDto>({
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
  const categoriesById = useMemo(
    () => new Map<string, CategoryDto>(categories.map((category) => [category.id, category])),
    [categories]
  );
  const visibleTasks = managedProjectIds
    ? items.filter((task) => projectsById.has(task.projectId))
    : items;

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PendingTaskConfirm | null>(null);

  const confirmCopy = confirmTarget
    ? getTaskConfirmCopy(confirmTarget.action, {
        taskName: confirmTarget.task.taskName,
        categoryName:
          confirmTarget.task.categoryName ??
          categoriesById.get(confirmTarget.task.categoryId)?.name,
        categoryIsActive: categoriesById.get(confirmTarget.task.categoryId)?.isActive ?? false,
        projectIsActive: projectsById.get(confirmTarget.task.projectId)?.isActive ?? true
      })
    : null;

  async function handleExport() {
    try {
      const params = new URLSearchParams({ format: "xlsx" });
      if (projectFilter !== ALL_PROJECTS) params.set("projectId", projectFilter);
      if (search.trim()) params.set("search", search.trim());
      await saveDownloadResponse(
        await apiDownloadGet(`${ROUTES.TASKS.EXPORT}?${params.toString()}`, workspaceId),
        "tasks_export.xlsx"
      );
      toast.success("Tasks exported.");
    } catch {
      toast.error("Failed to export tasks.");
    }
  }

  async function handleConfirmAction() {
    if (!confirmTarget) return;
    const { action, task } = confirmTarget;
    setConfirmTarget(null);
    setBusyId(task.id);
    try {
      if (action === "delete") {
        await api(ROUTES.TASKS.BY_ID(task.id), { method: "DELETE", workspaceId });
        toast.success(`"${task.taskName}" deleted.`);
      } else {
        await api(ROUTES.TASKS.BY_ID(task.id), {
          method: "PATCH",
          workspaceId,
          body: JSON.stringify({ isActive: action === "activate" })
        });
        toast.success(
          action === "activate"
            ? `"${task.taskName}" activated.`
            : `"${task.taskName}" deactivated.`
        );
      }
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update task.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6" data-testid="unified-tasks">
      <AppBar
        title="Tasks"
        description={
          canManage
            ? "Create, import, and manage common project tasks."
            : managedProjectIds
              ? "Browse tasks in your managed projects."
              : "Browse the project tasks available to you."
        }
        actions={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setImportOpen(true)}
                data-testid="tasks-import"
              >
                <Upload className="size-4" aria-hidden />
                Import
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void handleExport()}
                data-testid="tasks-export"
              >
                <Download className="size-4" aria-hidden />
                Export
              </Button>
              <Button
                type="button"
                className="gap-2"
                onClick={() => {
                  setEditingTask(null);
                  setFormOpen(true);
                }}
                data-testid="tasks-add"
              >
                <Plus className="size-4" aria-hidden />
                Add task
              </Button>
            </div>
          ) : null
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
          <TableLoadingState rows={6} columns={canManage ? 5 : 3} />
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
                  {canManage ? (
                    <DataTableHead className="w-[1%] whitespace-nowrap">Actions</DataTableHead>
                  ) : null}
                </DataTableHeaderRow>
              </TableHeader>
              <TableBody>
                {visibleTasks.map((task) => (
                  <TableRow key={task.id} className={entityRowClassName(task.isActive)}>
                    <DataTableCell className="font-medium">{task.taskName}</DataTableCell>
                    <DataTableCell>{projectsById.get(task.projectId)?.name ?? "—"}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={task.billableDefault ? "default" : "secondary"}>
                        {task.billableDefault ? "Billable" : "Non-billable"}
                      </Badge>
                    </DataTableCell>
                    {canManage ? (
                      <DataTableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Edit ${task.taskName}`}
                            disabled={busyId === task.id}
                            onClick={() => {
                              setEditingTask(task);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={
                              task.isActive
                                ? `Deactivate ${task.taskName}`
                                : `Activate ${task.taskName}`
                            }
                            disabled={busyId === task.id}
                            onClick={() =>
                              setConfirmTarget({
                                action: task.isActive ? "deactivate" : "activate",
                                task
                              })
                            }
                          >
                            {task.isActive ? (
                              <Lock className="size-4" />
                            ) : (
                              <Unlock className="size-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Delete ${task.taskName}`}
                            disabled={busyId === task.id}
                            onClick={() => setConfirmTarget({ action: "delete", task })}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" asChild>
                            <Link
                              href={`/projects/${task.projectId}/tasks`}
                              aria-label={`Open ${task.taskName} in project`}
                              data-testid={`task-open-project-${task.id}`}
                            >
                              <ExternalLink className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      </DataTableCell>
                    ) : null}
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

      {canManage ? (
        <>
          <TaskFormDialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) setEditingTask(null);
            }}
            workspaceId={workspaceId}
            projects={projects}
            categories={categories}
            editingTask={editingTask}
            defaultProjectId={projectFilter !== ALL_PROJECTS ? projectFilter : undefined}
            onSaved={() => void reload()}
          />
          <TasksImportModal
            open={importOpen}
            onOpenChange={setImportOpen}
            workspaceId={workspaceId}
            onImported={() => void reload()}
          />
          <ConfirmDialog
            open={Boolean(confirmTarget && confirmCopy)}
            title={confirmCopy?.title ?? ""}
            description={confirmCopy?.description}
            confirmLabel={confirmCopy?.confirmLabel}
            destructive={confirmCopy?.destructive}
            onConfirm={() => void handleConfirmAction()}
            onCancel={() => setConfirmTarget(null)}
          />
        </>
      ) : null}
    </div>
  );
}
