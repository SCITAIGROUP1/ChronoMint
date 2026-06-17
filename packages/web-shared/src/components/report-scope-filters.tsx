"use client";

import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { Badge, Button, Label, ProjectColorDot, SearchableSelect, cn } from "@kloqra/ui";
import { ChevronDown, Filter, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type ScopeMember = { userId: string; userName: string };

export type ReportScopeFilterValues = {
  projectId: string;
  categoryId: string;
  taskId: string;
  userId: string;
};

type ReportScopeFiltersProps = {
  values: ReportScopeFilterValues;
  projects: ProjectDto[];
  categories: CategoryDto[];
  tasks: TaskDto[];
  members: ScopeMember[];
  onProjectChange: (projectId: string) => void;
  onCategoryChange: (categoryId: string) => void;
  onTaskChange: (taskId: string) => void;
  onUserChange: (userId: string) => void;
  onClearAll: () => void;
  taskRequiresProject?: boolean;
  memberRequiresProject?: boolean;
  hideMemberFilter?: boolean;
  memberAllLabel?: string;
  memberPlaceholder?: string;
  hintText?: string;
  compact?: boolean;
  className?: string;
  footer?: React.ReactNode;
};

function activeFilterCount(values: ReportScopeFilterValues, includeMember: boolean) {
  const parts = [values.projectId, values.categoryId, values.taskId];
  if (includeMember) parts.push(values.userId);
  return parts.filter(Boolean).length;
}

export function ReportScopeFilters({
  values,
  projects,
  categories,
  tasks,
  members,
  onProjectChange,
  onCategoryChange,
  onTaskChange,
  onUserChange,
  onClearAll,
  taskRequiresProject = false,
  memberRequiresProject = false,
  hideMemberFilter = false,
  memberAllLabel = "All members",
  memberPlaceholder = "All members",
  hintText = "Optional — narrow charts and exports",
  compact = false,
  className,
  footer
}: ReportScopeFiltersProps) {
  const activeCount = activeFilterCount(values, !hideMemberFilter);
  const [open, setOpen] = useState(activeCount > 0);

  useEffect(() => {
    if (activeCount > 0) setOpen(true);
  }, [activeCount]);

  const chips = useMemo(() => {
    const out: { key: string; label: string; onClear: () => void }[] = [];
    if (values.projectId) {
      const p = projects.find((x) => x.id === values.projectId);
      out.push({
        key: "project",
        label: p ? `Project: ${p.name}` : "Project",
        onClear: () => onProjectChange("")
      });
    }
    if (values.categoryId) {
      const c = categories.find((x) => x.id === values.categoryId);
      out.push({
        key: "category",
        label: c ? `Category: ${c.name}` : "Category",
        onClear: () => onCategoryChange("")
      });
    }
    if (values.taskId) {
      const t = tasks.find((x) => x.id === values.taskId);
      out.push({
        key: "task",
        label: t ? `Task: ${t.taskName}` : "Task",
        onClear: () => onTaskChange("")
      });
    }
    if (!hideMemberFilter && values.userId) {
      const m = members.find((x) => x.userId === values.userId);
      out.push({
        key: "member",
        label: m ? `Member: ${m.userName}` : "Member",
        onClear: () => onUserChange("")
      });
    }
    return out;
  }, [
    values,
    projects,
    categories,
    tasks,
    members,
    hideMemberFilter,
    onProjectChange,
    onCategoryChange,
    onTaskChange,
    onUserChange
  ]);

  const triggerClass = compact ? "h-9 bg-background" : undefined;
  const placeholderClass = compact
    ? "flex h-9 items-center rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground"
    : "flex h-10 items-center rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground";

  const gridCols = hideMemberFilter
    ? "grid-cols-1 sm:grid-cols-3"
    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("w-full min-w-0 space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={open ? "secondary" : "outline"}
          size="sm"
          className={cn("gap-1.5", compact && "h-9")}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden />
          Scope filters
          {activeCount > 0 ? (
            <Badge variant="default" className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          ) : null}
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </Button>
        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onClearAll}
          >
            Clear all
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">{hintText}</span>
        )}
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 pl-2 pr-1 py-1 font-normal text-xs max-w-full"
            >
              <span className="truncate">{chip.label}</span>
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                onClick={chip.onClear}
                aria-label={`Remove ${chip.label}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {open ? (
        <div
          className={cn("grid gap-4 rounded-lg border border-border/60 bg-muted/15 p-4", gridCols)}
        >
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Project</Label>
            <SearchableSelect
              value={values.projectId || "__all__"}
              onValueChange={(v) => onProjectChange(v === "__all__" ? "" : v)}
              options={[
                { value: "__all__", label: "All projects" },
                ...projects.map((p) => ({ value: p.id, label: p.name }))
              ]}
              placeholder="All projects"
              searchPlaceholder="Search projects…"
              triggerClassName={triggerClass}
              renderOption={(option) =>
                option.value === "__all__" ? (
                  option.label
                ) : (
                  <span className="flex items-center gap-2">
                    <ProjectColorDot
                      color={projects.find((p) => p.id === option.value)?.color ?? "#236bfe"}
                    />
                    {option.label}
                  </span>
                )
              }
              renderValue={(option) =>
                option && option.value !== "__all__" ? (
                  <span className="flex items-center gap-2">
                    <ProjectColorDot
                      color={projects.find((p) => p.id === option.value)?.color ?? "#236bfe"}
                    />
                    {option.label}
                  </span>
                ) : (
                  (option?.label ?? "All projects")
                )
              }
              aria-label="Project"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Category</Label>
            <SearchableSelect
              value={values.categoryId || "__all__"}
              onValueChange={(v) => onCategoryChange(v === "__all__" ? "" : v)}
              options={[
                { value: "__all__", label: "All categories" },
                ...categories.map((c) => ({ value: c.id, label: c.name }))
              ]}
              placeholder="All categories"
              searchPlaceholder="Search categories…"
              triggerClassName={triggerClass}
              aria-label="Category"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Task</Label>
            {!taskRequiresProject || values.projectId ? (
              <SearchableSelect
                value={values.taskId || "__all__"}
                onValueChange={(v) => onTaskChange(v === "__all__" ? "" : v)}
                options={[
                  { value: "__all__", label: "All tasks" },
                  ...tasks.map((t) => ({ value: t.id, label: t.taskName }))
                ]}
                placeholder="All tasks"
                searchPlaceholder="Search tasks…"
                disabled={taskRequiresProject && !values.projectId}
                triggerClassName={triggerClass}
                aria-label="Task"
              />
            ) : (
              <p className={placeholderClass}>Select a project first</p>
            )}
          </div>

          {!hideMemberFilter ? (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Member</Label>
              {!memberRequiresProject || values.projectId ? (
                <SearchableSelect
                  value={values.userId || "__all__"}
                  onValueChange={(v) => onUserChange(v === "__all__" ? "" : v)}
                  options={[
                    { value: "__all__", label: memberAllLabel },
                    ...members.map((m) => ({ value: m.userId, label: m.userName }))
                  ]}
                  placeholder={memberPlaceholder}
                  searchPlaceholder="Search members…"
                  disabled={memberRequiresProject && !values.projectId}
                  triggerClassName={triggerClass}
                  aria-label="Member"
                />
              ) : (
                <p className={placeholderClass}>Select a project first</p>
              )}
            </div>
          ) : null}

          {footer ? (
            <div className={cn(hideMemberFilter ? "sm:col-span-3" : "sm:col-span-2 lg:col-span-4")}>
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
