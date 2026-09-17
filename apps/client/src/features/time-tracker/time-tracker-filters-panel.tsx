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
  SearchableMultiSelect,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  controlHeightClass
} from "@kloqra/ui";
import { Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import { formatProjectLabel } from "@/lib/project-labels";

export const TIME_TRACKER_FILTERS_ROW_CLASS =
  "grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2";

export type BillabilityFilter = "all" | "billable";

export type TimeTrackerFilterValues = {
  categoryId: string;
  taskId: string;
  billability: BillabilityFilter;
};

type TimeTrackerFilterChip = {
  key: string;
  kind: string;
  value: string;
  onClear: () => void;
};

type TimeTrackerFiltersPanelProps = {
  values: TimeTrackerFilterValues;
  projects: ProjectDto[];
  categories: CategoryDto[];
  tasks: TaskDto[];
  projectId: string[];
  onProjectChange: (projectId: string[]) => void;
  onCategoryChange: (categoryId: string) => void;
  onTaskChange: (taskId: string) => void;
  onBillabilityChange: (value: BillabilityFilter) => void;
  onClear: () => void;
  memberFilter?: string[];
  onMemberChange?: (memberIds: string[]) => void;
  members?: { value: string; label: string }[];
  hideMemberFilter?: boolean;
  workspaceNamesById?: Record<string, string>;
  className?: string;
  /** When false, the trigger is shown without applied chips so a parent can host them. */
  showAppliedChips?: boolean;
};

const triggerClass = "h-9 w-full bg-background";

function countActiveFilters(
  values: TimeTrackerFilterValues,
  projectId: string[],
  memberFilter: string[],
  includeMember: boolean
) {
  return (
    Number(projectId.length > 0) +
    Number(includeMember && memberFilter.length > 0) +
    Number(values.billability !== "all") +
    Number(Boolean(values.categoryId)) +
    Number(Boolean(values.taskId))
  );
}

export function collectTimeTrackerFilterChips({
  values,
  projectId,
  projects,
  categories,
  tasks,
  showMember,
  memberFilter,
  members,
  workspaceNamesById,
  onProjectChange,
  onCategoryChange,
  onTaskChange,
  onMemberChange,
  onBillabilityChange
}: {
  values: TimeTrackerFilterValues;
  projectId: string[];
  projects: ProjectDto[];
  categories: CategoryDto[];
  tasks: TaskDto[];
  showMember: boolean;
  memberFilter: string[];
  members: { value: string; label: string }[];
  workspaceNamesById: Record<string, string>;
  onProjectChange: (projectId: string[]) => void;
  onCategoryChange: (categoryId: string) => void;
  onTaskChange: (taskId: string) => void;
  onMemberChange?: (memberIds: string[]) => void;
  onBillabilityChange: (value: BillabilityFilter) => void;
}): TimeTrackerFilterChip[] {
  const out: TimeTrackerFilterChip[] = [];
  if (projectId.length === 1) {
    const project = projects.find((item) => item.id === projectId[0]);
    out.push({
      key: "project",
      kind: "Project",
      value: project ? formatProjectLabel(project, workspaceNamesById) : "1 selected",
      onClear: () => {
        onProjectChange([]);
        onTaskChange("");
      }
    });
  } else if (projectId.length > 1) {
    out.push({
      key: "projects",
      kind: "Projects",
      value: `${projectId.length} selected`,
      onClear: () => {
        onProjectChange([]);
        onTaskChange("");
      }
    });
  }
  if (values.categoryId) {
    const category = categories.find((item) => item.id === values.categoryId);
    out.push({
      key: "category",
      kind: "Category",
      value: category?.name ?? "Selected",
      onClear: () => {
        onCategoryChange("");
        onTaskChange("");
      }
    });
  }
  if (values.taskId) {
    const task = tasks.find((item) => item.id === values.taskId);
    out.push({
      key: "task",
      kind: "Task",
      value: task?.taskName ?? "Selected",
      onClear: () => onTaskChange("")
    });
  }
  if (showMember && memberFilter.length === 1) {
    const member = members.find((item) => item.value === memberFilter[0]);
    out.push({
      key: "member",
      kind: "Member",
      value: member?.label ?? "1 selected",
      onClear: () => onMemberChange?.([])
    });
  } else if (showMember && memberFilter.length > 1) {
    out.push({
      key: "members",
      kind: "Members",
      value: `${memberFilter.length} selected`,
      onClear: () => onMemberChange?.([])
    });
  }
  if (values.billability !== "all") {
    out.push({
      key: "billability",
      kind: "Billability",
      value: "Billable only",
      onClear: () => onBillabilityChange("all")
    });
  }
  return out;
}

function FilterChipItem({ chip }: { chip: TimeTrackerFilterChip }) {
  const name = `${chip.kind} ${chip.value}`;
  return (
    <span
      className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 py-1 pl-2 pr-0.5 text-xs"
      data-testid={`time-tracker-filter-chip-${chip.key}`}
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

export function TimeTrackerFiltersPanel({
  values,
  projects,
  categories,
  tasks,
  projectId,
  onProjectChange,
  onCategoryChange,
  onTaskChange,
  onBillabilityChange,
  onClear,
  memberFilter = [],
  onMemberChange,
  members = [],
  hideMemberFilter = false,
  workspaceNamesById = {},
  className,
  showAppliedChips = true
}: TimeTrackerFiltersPanelProps) {
  const [open, setOpen] = useState(false);
  const showMember = !hideMemberFilter;
  const activeCount = countActiveFilters(values, projectId, memberFilter, showMember);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (projectId.length > 0 && !projectId.includes(task.projectId)) return false;
      if (values.categoryId && task.categoryId !== values.categoryId) return false;
      return true;
    });
  }, [tasks, projectId, values.categoryId]);

  const chips = useMemo(
    () =>
      collectTimeTrackerFilterChips({
        values,
        projectId,
        projects,
        categories,
        tasks,
        showMember,
        memberFilter,
        members,
        workspaceNamesById,
        onProjectChange,
        onCategoryChange,
        onTaskChange,
        onMemberChange,
        onBillabilityChange
      }),
    [
      values,
      projectId,
      projects,
      categories,
      tasks,
      showMember,
      memberFilter,
      members,
      workspaceNamesById,
      onProjectChange,
      onCategoryChange,
      onTaskChange,
      onMemberChange,
      onBillabilityChange
    ]
  );

  return (
    <>
      <div
        className={cn("flex shrink-0 items-center justify-end self-start", className)}
        data-testid="time-tracker-filters-trigger"
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={open || activeCount > 0 ? "secondary" : "outline"}
              className={cn(controlHeightClass, "shrink-0 gap-2")}
              aria-expanded={open}
              aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"}
            >
              <Filter className="size-4" aria-hidden />
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
            data-testid="time-tracker-filters-panel"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest("[data-radix-popper-content-wrapper]")) {
                event.preventDefault();
              }
            }}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Filters</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Optional — narrow this list
                </p>
              </div>
              {activeCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-xs"
                  onClick={onClear}
                >
                  Clear all
                </Button>
              ) : null}
            </div>

            <div className="min-h-0 space-y-3 overflow-y-auto border-t border-border/70 px-3.5 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Project</Label>
                <SearchableMultiSelect
                  value={projectId}
                  onChange={(next) => {
                    onProjectChange(next);
                    onTaskChange("");
                  }}
                  options={projects.map((project) => ({
                    value: project.id,
                    label: formatProjectLabel(project, workspaceNamesById),
                    color: project.color
                  }))}
                  placeholder="All projects"
                  searchPlaceholder="Search projects…"
                  selectAllLabel="All projects"
                  triggerClassName={triggerClass}
                  contentClassName="z-[80]"
                  aria-label="Project"
                  renderOption={(option) => (
                    <span className="flex items-center gap-2">
                      {"color" in option && option.color ? (
                        <ProjectColorDot color={option.color as string} size="sm" />
                      ) : null}
                      {option.label}
                    </span>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="time-tracker-category"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Category
                </Label>
                <SearchableSelect
                  id="time-tracker-category"
                  value={values.categoryId || "__all__"}
                  onValueChange={(value) => {
                    onCategoryChange(value === "__all__" ? "" : value);
                    onTaskChange("");
                  }}
                  options={[
                    { value: "__all__", label: "All categories" },
                    ...categories.map((category) => ({ value: category.id, label: category.name }))
                  ]}
                  placeholder="All categories"
                  searchPlaceholder="Search categories…"
                  triggerClassName={triggerClass}
                  contentClassName="z-[80]"
                  aria-label="Category"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="time-tracker-task"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Task
                </Label>
                <SearchableSelect
                  id="time-tracker-task"
                  value={values.taskId || "__all__"}
                  onValueChange={(value) => onTaskChange(value === "__all__" ? "" : value)}
                  options={[
                    { value: "__all__", label: "All tasks" },
                    ...filteredTasks.map((task) => ({ value: task.id, label: task.taskName }))
                  ]}
                  placeholder="All tasks"
                  searchPlaceholder="Search tasks…"
                  triggerClassName={triggerClass}
                  contentClassName="z-[80]"
                  aria-label="Task"
                />
              </div>

              {showMember ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Member</Label>
                  <SearchableMultiSelect
                    value={memberFilter}
                    onChange={(next) => onMemberChange?.(next)}
                    options={members}
                    placeholder="All members"
                    searchPlaceholder="Search members…"
                    selectAllLabel="All members"
                    triggerClassName={triggerClass}
                    contentClassName="z-[80]"
                    aria-label="Member"
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label
                  htmlFor="time-tracker-billability"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Billability
                </Label>
                <Select
                  value={values.billability}
                  onValueChange={(value) => onBillabilityChange(value as BillabilityFilter)}
                >
                  <SelectTrigger
                    id="time-tracker-billability"
                    className={triggerClass}
                    aria-label="Billability"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    <SelectItem value="all">All entries</SelectItem>
                    <SelectItem value="billable">Billable only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {showAppliedChips ? (
        <TimeTrackerAppliedFilterChips chips={chips} onClear={onClear} className="col-span-full" />
      ) : null}
    </>
  );
}

export function TimeTrackerAppliedFilterChips({
  chips,
  onClear,
  className
}: {
  chips: TimeTrackerFilterChip[];
  onClear: () => void;
  className?: string;
}) {
  if (chips.length === 0) return null;

  return (
    <div
      className={cn("flex min-w-0 items-center gap-2 border-t border-border/60 pt-2", className)}
      data-testid="time-tracker-filters-applied"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <FilterChipItem key={chip.key} chip={chip} />
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
        onClick={onClear}
      >
        Clear
      </Button>
    </div>
  );
}
