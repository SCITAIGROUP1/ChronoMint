"use client";

import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import {
  AppBarSecondary,
  Button,
  DateRangePicker,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  controlHeightClass
} from "@kloqra/ui";
import { Eye, EyeOff, MoreHorizontal, Search } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import {
  TimeTrackerAppliedFilterChips,
  TimeTrackerFiltersPanel,
  collectTimeTrackerFilterChips,
  type TimeTrackerFilterValues
} from "./time-tracker-filters-panel";
import {
  TIME_TRACKER_PERIOD_LABELS,
  TIME_TRACKER_PERIOD_PRESETS,
  type TimeTrackerPeriodSelection
} from "./time-tracker-period";

type TimeTrackerToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  projectId: string[];
  onProjectChange: (value: string[]) => void;
  period: TimeTrackerPeriodSelection;
  onPeriodChange: (value: TimeTrackerPeriodSelection) => void;
  rangeFrom: string;
  rangeTo: string;
  onRangeChange: (from: string, to: string) => void;
  weekStartsOn?: 0 | 1;
  projects: ProjectDto[];
  categories: CategoryDto[];
  tasks: TaskDto[];
  workspaceNamesById: Record<string, string>;
  filterValues: TimeTrackerFilterValues;
  onCategoryChange: (value: string) => void;
  onTaskChange: (value: string) => void;
  onBillabilityChange: (value: TimeTrackerFilterValues["billability"]) => void;
  onClearFilters: () => void;
  memberFilter: string[];
  onMemberChange: (v: string[]) => void;
  members: { value: string; label: string }[];
  hideMemberFilter?: boolean;
  analyticsVisible?: boolean;
  onToggleAnalytics?: () => void;
  extraActions?: ReactNode;
};

export function TimeTrackerToolbar({
  search,
  onSearchChange,
  projectId,
  onProjectChange,
  period,
  onPeriodChange,
  rangeFrom,
  rangeTo,
  onRangeChange,
  weekStartsOn = 1,
  projects,
  categories,
  tasks,
  workspaceNamesById,
  filterValues,
  onCategoryChange,
  onTaskChange,
  onBillabilityChange,
  onClearFilters,
  memberFilter,
  onMemberChange,
  members,
  hideMemberFilter = false,
  analyticsVisible = false,
  onToggleAnalytics,
  extraActions
}: TimeTrackerToolbarProps) {
  const showMember = !hideMemberFilter;
  const appliedChips = useMemo(
    () =>
      collectTimeTrackerFilterChips({
        values: filterValues,
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
      filterValues,
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
    <div className="flex w-full min-w-0 flex-col gap-2" data-testid="time-tracker-toolbar">
      <AppBarSecondary
        leading={
          <div
            className="flex min-w-0 flex-1 flex-nowrap items-center gap-2"
            data-testid="time-tracker-toolbar-leading"
          >
            <Select
              value={period}
              onValueChange={(value) => onPeriodChange(value as TimeTrackerPeriodSelection)}
            >
              <SelectTrigger
                className={cn(controlHeightClass, "w-[10.5rem] shrink-0")}
                aria-label="Time period"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_TRACKER_PERIOD_PRESETS.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {TIME_TRACKER_PERIOD_LABELS[preset]}
                  </SelectItem>
                ))}
                <SelectItem value="custom">{TIME_TRACKER_PERIOD_LABELS.custom}</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker
              from={rangeFrom}
              to={rangeTo}
              onChange={onRangeChange}
              weekStartsOn={weekStartsOn}
              ariaLabel="Date range"
              className="w-[14.5rem] shrink-0"
              numberOfMonths={2}
              popoverAlign="end"
            />
            <div className="relative min-w-[8rem] flex-1 @min-[960px]/shell:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search entries..."
                className="pl-9"
                aria-label="Search entries"
              />
            </div>
          </div>
        }
        trailing={
          <>
            {onToggleAnalytics ? (
              <Button
                type="button"
                variant="outline"
                className={cn(controlHeightClass, "shrink-0 gap-2")}
                onClick={onToggleAnalytics}
                aria-pressed={analyticsVisible}
                aria-label={analyticsVisible ? "Hide analytics" : "Show analytics"}
              >
                {analyticsVisible ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
                Analytics
              </Button>
            ) : null}
            <TimeTrackerFiltersPanel
              values={filterValues}
              projects={projects}
              categories={categories}
              tasks={tasks}
              projectId={projectId}
              onProjectChange={onProjectChange}
              onCategoryChange={onCategoryChange}
              onTaskChange={onTaskChange}
              onBillabilityChange={onBillabilityChange}
              onClear={onClearFilters}
              memberFilter={memberFilter}
              onMemberChange={onMemberChange}
              members={members}
              hideMemberFilter={hideMemberFilter}
              workspaceNamesById={workspaceNamesById}
              showAppliedChips={false}
            />
            {extraActions ? (
              <>
                <div
                  className="hidden items-center gap-2 @min-[960px]/shell:flex"
                  data-testid="time-tracker-more-actions-desktop"
                >
                  {extraActions}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn(controlHeightClass, "w-10 shrink-0 @min-[960px]/shell:hidden")}
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 bg-card p-2">
                    <div className="flex flex-col gap-2">{extraActions}</div>
                  </PopoverContent>
                </Popover>
              </>
            ) : null}
          </>
        }
      />
      <TimeTrackerAppliedFilterChips chips={appliedChips} onClear={onClearFilters} />
    </div>
  );
}
