"use client";

import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  Badge,
  Button,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ProjectColorDot,
  SearchableSelect,
  SearchableMultiSelect,
  cn
} from "@kloqra/ui";
import { Filter, X } from "lucide-react";
import { useMemo, useState } from "react";

export type ScopeMember = { userId: string; userName: string };

export type ReportScopeFilterValues = {
  projectId: string | string[];
  categoryId: string | string[];
  taskId: string;
  userId: string | string[];
};

type ReportScopeFiltersProps = {
  values: ReportScopeFilterValues;
  projects: ProjectDto[];
  categories: CategoryDto[];
  tasks: TaskDto[];
  members: ScopeMember[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onProjectChange: (projectId: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCategoryChange: (categoryId: any) => void;
  onTaskChange: (taskId: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUserChange: (userId: any) => void;
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

function hasIdFilter(value: string | string[]): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function activeFilterCount(values: ReportScopeFilterValues, includeMember: boolean) {
  const parts: string[] = [];
  if (hasIdFilter(values.projectId)) parts.push("project");
  if (hasIdFilter(values.categoryId)) parts.push("category");
  if (values.taskId) parts.push("task");
  if (includeMember && hasIdFilter(values.userId)) parts.push("member");
  return parts.length;
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
  const [open, setOpen] = useState(false);

  const hasSelectedProject = hasIdFilter(values.projectId);

  const chips = useMemo(() => {
    const out: { key: string; label: string; onClear: () => void }[] = [];
    if (hasIdFilter(values.projectId)) {
      if (Array.isArray(values.projectId)) {
        if (values.projectId.length === 1) {
          const p = projects.find((x) => x.id === values.projectId[0]);
          out.push({
            key: "project",
            label: p ? `Project: ${p.name}` : "1 project",
            onClear: () => onProjectChange([])
          });
        } else {
          out.push({
            key: "projects",
            label: `${values.projectId.length} projects`,
            onClear: () => onProjectChange([])
          });
        }
      } else {
        const p = projects.find((x) => x.id === values.projectId);
        out.push({
          key: "project",
          label: p ? `Project: ${p.name}` : "Project",
          onClear: () => onProjectChange("")
        });
      }
    }
    if (hasIdFilter(values.categoryId)) {
      if (Array.isArray(values.categoryId)) {
        if (values.categoryId.length === 1) {
          const c = categories.find((x) => x.id === values.categoryId[0]);
          out.push({
            key: "category",
            label: c ? `Category: ${c.name}` : "1 category",
            onClear: () => onCategoryChange([])
          });
        } else {
          out.push({
            key: "categories",
            label: `${values.categoryId.length} categories`,
            onClear: () => onCategoryChange([])
          });
        }
      } else {
        const c = categories.find((x) => x.id === values.categoryId);
        out.push({
          key: "category",
          label: c ? `Category: ${c.name}` : "Category",
          onClear: () => onCategoryChange("")
        });
      }
    }
    if (values.taskId) {
      const t = tasks.find((x) => x.id === values.taskId);
      out.push({
        key: "task",
        label: t ? `Task: ${t.taskName}` : "Task",
        onClear: () => onTaskChange("")
      });
    }
    if (!hideMemberFilter && hasIdFilter(values.userId)) {
      if (Array.isArray(values.userId)) {
        if (values.userId.length === 1) {
          const m = members.find((x) => x.userId === values.userId[0]);
          out.push({
            key: "member",
            label: m ? `Member: ${m.userName}` : "1 member",
            onClear: () => onUserChange([])
          });
        } else {
          out.push({
            key: "members",
            label: `${values.userId.length} members`,
            onClear: () => onUserChange([])
          });
        }
      } else {
        const m = members.find((x) => x.userId === values.userId);
        out.push({
          key: "member",
          label: m ? `Member: ${m.userName}` : "Member",
          onClear: () => onUserChange("")
        });
      }
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

  const gridCols = hideMemberFilter ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={open || activeCount > 0 ? "secondary" : "outline"}
            size="sm"
            className={cn("h-9 gap-1.5 shrink-0", compact && "h-9")}
            aria-expanded={open}
            aria-label={activeCount > 0 ? `Scope filters, ${activeCount} active` : "Scope filters"}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filters
            {activeCount > 0 ? (
              <Badge variant="default" className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px]">
                {activeCount}
              </Badge>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(calc(100vw-2rem),28rem)] p-4"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Nested searchable selects also use popovers; keep the panel open while picking.
            const target = e.target as HTMLElement | null;
            if (target?.closest("[data-radix-popper-content-wrapper]")) {
              e.preventDefault();
            }
          }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Scope filters</p>
              <p className="text-xs text-muted-foreground">{hintText}</p>
            </div>
            {activeCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-xs"
                onClick={onClearAll}
              >
                Clear all
              </Button>
            ) : null}
          </div>

          <div className={cn("grid gap-3", gridCols)}>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Project</Label>
              {Array.isArray(values.projectId) ? (
                <SearchableMultiSelect
                  value={values.projectId}
                  onChange={onProjectChange}
                  options={projects.map((p) => ({ value: p.id, label: p.name, color: p.color }))}
                  placeholder="All projects"
                  searchPlaceholder="Search projects…"
                  selectAllLabel="All projects"
                  triggerClassName={triggerClass}
                  renderOption={(option) => (
                    <span className="flex items-center gap-2">
                      {"color" in option && option.color ? (
                        <ProjectColorDot color={option.color as string} />
                      ) : null}
                      {option.label}
                    </span>
                  )}
                  aria-label="Project"
                />
              ) : (
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
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Category</Label>
              {Array.isArray(values.categoryId) ? (
                <SearchableMultiSelect
                  value={values.categoryId}
                  onChange={onCategoryChange}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="All categories"
                  searchPlaceholder="Search categories…"
                  selectAllLabel="All categories"
                  triggerClassName={triggerClass}
                  aria-label="Category"
                />
              ) : (
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
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Task</Label>
              {!taskRequiresProject || hasSelectedProject ? (
                <SearchableSelect
                  value={values.taskId || "__all__"}
                  onValueChange={(v) => onTaskChange(v === "__all__" ? "" : v)}
                  options={[
                    { value: "__all__", label: "All tasks" },
                    ...tasks.map((t) => ({ value: t.id, label: t.taskName }))
                  ]}
                  placeholder="All tasks"
                  searchPlaceholder="Search tasks…"
                  disabled={taskRequiresProject && !hasSelectedProject}
                  triggerClassName={triggerClass}
                  aria-label="Task"
                />
              ) : (
                <p className={placeholderClass}>Select a project first</p>
              )}
            </div>

            {!hideMemberFilter ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Member</Label>
                {!memberRequiresProject || hasSelectedProject ? (
                  Array.isArray(values.userId) ? (
                    <SearchableMultiSelect
                      value={values.userId}
                      onChange={onUserChange}
                      options={members.map((m) => ({ value: m.userId, label: m.userName }))}
                      placeholder={memberPlaceholder}
                      searchPlaceholder="Search members…"
                      selectAllLabel={memberAllLabel}
                      triggerClassName={triggerClass}
                      aria-label="Member"
                    />
                  ) : (
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
                  )
                ) : (
                  <p className={placeholderClass}>Select a project first</p>
                )}
              </div>
            ) : null}
          </div>

          {footer ? <div className="mt-3 border-t border-border/60 pt-3">{footer}</div> : null}
        </PopoverContent>
      </Popover>

      {activeCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 text-xs"
          onClick={onClearAll}
        >
          Clear
        </Button>
      ) : null}

      {chips.length > 0 ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="max-w-full gap-1 py-1 pl-2 pr-1 text-xs font-normal"
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
    </div>
  );
}
