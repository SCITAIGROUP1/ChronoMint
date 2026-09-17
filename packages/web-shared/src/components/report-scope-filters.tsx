"use client";

import type { CategoryDto, NonProjectTimeFilter, ProjectDto, TaskDto } from "@kloqra/contracts";
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

const NON_PROJECT_TIME_OPTIONS: {
  value: NonProjectTimeFilter;
  label: string;
  keywords: string;
}[] = [
  { value: "include", label: "Include", keywords: "all holidays leave activities" },
  { value: "exclude", label: "Exclude", keywords: "project work only hide leave holiday" },
  { value: "only", label: "Only non-project", keywords: "holidays leave activities" }
];

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
  nonProjectTime?: NonProjectTimeFilter;
  onNonProjectTimeChange?: (value: NonProjectTimeFilter) => void;
  defaultNonProjectTime?: NonProjectTimeFilter;
};

type ScopeFilterChip = {
  key: string;
  kind: string;
  value: string;
  onClear: () => void;
};

function hasIdFilter(value: string | string[]): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function activeFilterCount(
  values: ReportScopeFilterValues,
  includeMember: boolean,
  nonProjectActive: boolean
) {
  const parts: string[] = [];
  if (hasIdFilter(values.projectId)) parts.push("project");
  if (hasIdFilter(values.categoryId)) parts.push("category");
  if (values.taskId) parts.push("task");
  if (includeMember && hasIdFilter(values.userId)) parts.push("member");
  if (nonProjectActive) parts.push("nonProject");
  return parts.length;
}

function nonProjectTimeLabel(value: NonProjectTimeFilter) {
  return NON_PROJECT_TIME_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function ScopeFilterChipItem({ chip }: { chip: ScopeFilterChip }) {
  const name = `${chip.kind} ${chip.value}`;
  return (
    <span
      className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 py-1 pl-2 pr-0.5 text-xs"
      data-testid={`scope-filter-chip-${chip.key}`}
    >
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {chip.kind}
      </span>
      <span className="min-w-0 truncate font-medium text-foreground" title={name}>
        {chip.value}
      </span>
      <button
        type="button"
        className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted-foreground/15 hover:text-foreground"
        onClick={chip.onClear}
        aria-label={`Remove ${name}`}
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </span>
  );
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
  footer,
  nonProjectTime,
  onNonProjectTimeChange,
  defaultNonProjectTime = "include"
}: ReportScopeFiltersProps) {
  const showNonProjectTime = Boolean(nonProjectTime && onNonProjectTimeChange);
  const nonProjectOnly = nonProjectTime === "only";
  const nonProjectActive =
    showNonProjectTime && nonProjectTime !== undefined && nonProjectTime !== defaultNonProjectTime;
  const scopedValues = nonProjectOnly
    ? {
        ...values,
        projectId: Array.isArray(values.projectId) ? [] : "",
        categoryId: Array.isArray(values.categoryId) ? [] : "",
        taskId: ""
      }
    : values;
  const activeCount = activeFilterCount(scopedValues, !hideMemberFilter, nonProjectActive);
  const [open, setOpen] = useState(false);

  const hasSelectedProject = hasIdFilter(values.projectId);
  const showProjectScopeFields = !nonProjectOnly;

  const chips = useMemo(() => {
    const out: ScopeFilterChip[] = [];
    if (hasIdFilter(scopedValues.projectId)) {
      if (Array.isArray(values.projectId)) {
        if (values.projectId.length === 1) {
          const p = projects.find((x) => x.id === values.projectId[0]);
          out.push({
            key: "project",
            kind: "Project",
            value: p?.name ?? "1 selected",
            onClear: () => onProjectChange([])
          });
        } else {
          out.push({
            key: "projects",
            kind: "Projects",
            value: `${values.projectId.length} selected`,
            onClear: () => onProjectChange([])
          });
        }
      } else {
        const p = projects.find((x) => x.id === values.projectId);
        out.push({
          key: "project",
          kind: "Project",
          value: p?.name ?? "Selected",
          onClear: () => onProjectChange("")
        });
      }
    }
    if (hasIdFilter(scopedValues.categoryId)) {
      if (Array.isArray(values.categoryId)) {
        if (values.categoryId.length === 1) {
          const c = categories.find((x) => x.id === values.categoryId[0]);
          out.push({
            key: "category",
            kind: "Category",
            value: c?.name ?? "1 selected",
            onClear: () => onCategoryChange([])
          });
        } else {
          out.push({
            key: "categories",
            kind: "Categories",
            value: `${values.categoryId.length} selected`,
            onClear: () => onCategoryChange([])
          });
        }
      } else {
        const c = categories.find((x) => x.id === values.categoryId);
        out.push({
          key: "category",
          kind: "Category",
          value: c?.name ?? "Selected",
          onClear: () => onCategoryChange("")
        });
      }
    }
    if (scopedValues.taskId) {
      const t = tasks.find((x) => x.id === values.taskId);
      out.push({
        key: "task",
        kind: "Task",
        value: t?.taskName ?? "Selected",
        onClear: () => onTaskChange("")
      });
    }
    if (!hideMemberFilter && hasIdFilter(values.userId)) {
      if (Array.isArray(values.userId)) {
        if (values.userId.length === 1) {
          const m = members.find((x) => x.userId === values.userId[0]);
          out.push({
            key: "member",
            kind: "Member",
            value: m?.userName ?? "1 selected",
            onClear: () => onUserChange([])
          });
        } else {
          out.push({
            key: "members",
            kind: "Members",
            value: `${values.userId.length} selected`,
            onClear: () => onUserChange([])
          });
        }
      } else {
        const m = members.find((x) => x.userId === values.userId);
        out.push({
          key: "member",
          kind: "Member",
          value: m?.userName ?? "Selected",
          onClear: () => onUserChange("")
        });
      }
    }
    if (nonProjectActive && nonProjectTime && onNonProjectTimeChange) {
      out.push({
        key: "nonProject",
        kind: "Non-project",
        value: nonProjectTimeLabel(nonProjectTime),
        onClear: () => onNonProjectTimeChange(defaultNonProjectTime)
      });
    }
    return out;
  }, [
    values,
    scopedValues,
    projects,
    categories,
    tasks,
    members,
    hideMemberFilter,
    onProjectChange,
    onCategoryChange,
    onTaskChange,
    onUserChange,
    nonProjectActive,
    nonProjectTime,
    onNonProjectTimeChange,
    defaultNonProjectTime
  ]);

  const triggerClass = compact ? "h-9 w-full bg-background" : "w-full";
  const placeholderClass = compact
    ? "flex h-9 items-center rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground"
    : "flex h-10 items-center rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground";

  return (
    <>
      <div
        className={cn("flex shrink-0 items-center justify-end self-start", className)}
        data-testid="scope-filters-trigger"
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={open || activeCount > 0 ? "secondary" : "outline"}
              size="sm"
              className="h-9 gap-1.5 shrink-0"
              aria-expanded={open}
              aria-label={
                activeCount > 0 ? `Scope filters, ${activeCount} active` : "Scope filters"
              }
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
            align="end"
            side="bottom"
            sideOffset={8}
            className="flex w-[min(calc(100vw-2rem),20.5rem)] max-h-[min(32rem,calc(100dvh-5rem))] flex-col overflow-hidden p-0"
            data-testid="scope-filters-panel"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              // Nested searchable selects also use popovers; keep the panel open while picking.
              const target = e.target as HTMLElement | null;
              if (target?.closest("[data-radix-popper-content-wrapper]")) {
                e.preventDefault();
              }
            }}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Filters</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {nonProjectOnly
                    ? "Leave, holidays, and organization time — project filters don’t apply"
                    : hintText}
                </p>
              </div>
              {activeCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-xs"
                  onClick={onClearAll}
                >
                  Clear all
                </Button>
              ) : null}
            </div>

            <div className="min-h-0 space-y-3 overflow-y-auto border-t border-border/70 px-3.5 py-3">
              {showProjectScopeFields ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Project</Label>
                    {Array.isArray(values.projectId) ? (
                      <SearchableMultiSelect
                        value={values.projectId}
                        onChange={onProjectChange}
                        options={projects.map((p) => ({
                          value: p.id,
                          label: p.name,
                          color: p.color
                        }))}
                        placeholder="All projects"
                        searchPlaceholder="Search projects…"
                        selectAllLabel="All projects"
                        triggerClassName={triggerClass}
                        contentClassName="z-[80]"
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
                        contentClassName="z-[80]"
                        renderOption={(option) =>
                          option.value === "__all__" ? (
                            option.label
                          ) : (
                            <span className="flex items-center gap-2">
                              <ProjectColorDot
                                color={
                                  projects.find((p) => p.id === option.value)?.color ?? "#236bfe"
                                }
                              />
                              {option.label}
                            </span>
                          )
                        }
                        renderValue={(option) =>
                          option && option.value !== "__all__" ? (
                            <span className="flex items-center gap-2">
                              <ProjectColorDot
                                color={
                                  projects.find((p) => p.id === option.value)?.color ?? "#236bfe"
                                }
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
                        contentClassName="z-[80]"
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
                        contentClassName="z-[80]"
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
                        contentClassName="z-[80]"
                        aria-label="Task"
                      />
                    ) : (
                      <p className={placeholderClass}>Select a project first</p>
                    )}
                  </div>
                </>
              ) : null}

              {!hideMemberFilter ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Member</Label>
                  {!memberRequiresProject || nonProjectOnly || hasSelectedProject ? (
                    Array.isArray(values.userId) ? (
                      <SearchableMultiSelect
                        value={values.userId}
                        onChange={onUserChange}
                        options={members.map((m) => ({ value: m.userId, label: m.userName }))}
                        placeholder={memberPlaceholder}
                        searchPlaceholder="Search members…"
                        selectAllLabel={memberAllLabel}
                        triggerClassName={triggerClass}
                        contentClassName="z-[80]"
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
                        disabled={memberRequiresProject && !nonProjectOnly && !values.projectId}
                        triggerClassName={triggerClass}
                        contentClassName="z-[80]"
                        aria-label="Member"
                      />
                    )
                  ) : (
                    <p className={placeholderClass}>Select a project first</p>
                  )}
                </div>
              ) : null}

              {showNonProjectTime && nonProjectTime && onNonProjectTimeChange ? (
                <div className="space-y-1.5" data-testid="non-project-time-filter">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Non-project time
                  </Label>
                  <SearchableSelect
                    value={nonProjectTime}
                    onValueChange={(next) => onNonProjectTimeChange(next as NonProjectTimeFilter)}
                    options={NON_PROJECT_TIME_OPTIONS}
                    placeholder="Include"
                    searchPlaceholder="Search include, exclude, only…"
                    triggerClassName={triggerClass}
                    contentClassName="z-[80]"
                    aria-label="Non-project time"
                  />
                </div>
              ) : null}
            </div>

            {footer ? <div className="border-t border-border/70 px-3.5 py-3">{footer}</div> : null}
          </PopoverContent>
        </Popover>
      </div>

      {chips.length > 0 ? (
        <div
          className="col-span-full flex min-w-0 items-center gap-2 border-t border-border/60 pt-2"
          data-testid="scope-filters-applied"
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <ScopeFilterChipItem key={chip.key} chip={chip} />
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
            onClick={onClearAll}
          >
            Clear
          </Button>
        </div>
      ) : null}
    </>
  );
}
