"use client";

import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import {
  Badge,
  Button,
  DateRangePicker,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SearchableMultiSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  formatDateRangeLabel
} from "@kloqra/ui";
import { hasActiveApprovalsFilter } from "@kloqra/web-shared";
import { Filter, LayoutGrid, List, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ApprovalsFilterOption } from "./use-approvals-filter-options";

export type ApprovalsFiltersBarProps = {
  filters: TimesheetApprovalsFilterQuery;
  onChange: (next: TimesheetApprovalsFilterQuery) => void;
  onClear: () => void;
  projectOptions: ApprovalsFilterOption[];
  memberOptions: ApprovalsFilterOption[];
  loading?: boolean;
  resultCount?: number;
  showSort?: boolean;
  viewMode?: "card" | "table";
  onViewModeChange?: (mode: "card" | "table") => void;
  weekStartsOn?: 0 | 1;
};

type ApprovalsFilterChip = {
  key: string;
  kind: string;
  value: string;
  onClear: () => void;
};

const triggerClass = "h-9 w-full bg-background";

function FilterChipItem({ chip }: { chip: ApprovalsFilterChip }) {
  const name = `${chip.kind} ${chip.value}`;
  return (
    <span
      className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-md border border-border/70 bg-muted/40 py-1 pl-2 pr-0.5 text-xs"
      data-testid={`approvals-filter-chip-${chip.key}`}
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

function ViewModeToggle({
  viewMode,
  onViewModeChange
}: {
  viewMode: "card" | "table";
  onViewModeChange: (mode: "card" | "table") => void;
}) {
  return (
    <div className="flex items-center rounded-lg border bg-background p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-7 w-7 p-0 rounded-md", viewMode === "card" && "bg-muted text-foreground")}
        onClick={() => onViewModeChange("card")}
        title="Card view"
      >
        <LayoutGrid className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-7 w-7 p-0 rounded-md", viewMode === "table" && "bg-muted text-foreground")}
        onClick={() => onViewModeChange("table")}
        title="Table view"
      >
        <List className="size-4" />
      </Button>
    </div>
  );
}

export function ApprovalsFiltersBar({
  filters,
  onChange,
  onClear,
  projectOptions,
  memberOptions,
  loading = false,
  showSort = false,
  viewMode,
  onViewModeChange,
  weekStartsOn = 1
}: ApprovalsFiltersBarProps) {
  const [open, setOpen] = useState(false);
  const active = hasActiveApprovalsFilter(filters);
  const projectIds = filters.projectId ?? [];
  const memberIds = filters.userId ?? [];
  const filterCount =
    (projectIds.length > 0 ? 1 : 0) +
    (memberIds.length > 0 ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0);

  const chips = useMemo(() => {
    const out: ApprovalsFilterChip[] = [];
    if (projectIds.length === 1) {
      const project = projectOptions.find((option) => option.value === projectIds[0]);
      out.push({
        key: "project",
        kind: "Project",
        value: project?.label ?? "1 selected",
        onClear: () => onChange({ ...filters, projectId: undefined })
      });
    } else if (projectIds.length > 1) {
      out.push({
        key: "projects",
        kind: "Projects",
        value: `${projectIds.length} selected`,
        onClear: () => onChange({ ...filters, projectId: undefined })
      });
    }
    if (memberIds.length === 1) {
      const member = memberOptions.find((option) => option.value === memberIds[0]);
      out.push({
        key: "member",
        kind: "Member",
        value: member?.label ?? "1 selected",
        onClear: () => onChange({ ...filters, userId: undefined })
      });
    } else if (memberIds.length > 1) {
      out.push({
        key: "members",
        kind: "Members",
        value: `${memberIds.length} selected`,
        onClear: () => onChange({ ...filters, userId: undefined })
      });
    }
    if (filters.from || filters.to) {
      out.push({
        key: "period",
        kind: "Period",
        value: formatDateRangeLabel(
          filters.from ?? filters.to ?? "",
          filters.to ?? filters.from ?? ""
        ),
        onClear: () => onChange({ ...filters, from: undefined, to: undefined })
      });
    }
    return out;
  }, [filters, projectIds, memberIds, projectOptions, memberOptions, onChange]);

  return (
    <div className="grid min-w-0 flex-1 grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2">
      <div className="flex items-center gap-2" data-testid="approvals-filters-trigger">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={open || filterCount > 0 ? "secondary" : "outline"}
              size="sm"
              className="h-9 gap-1.5 shrink-0"
              aria-expanded={open}
              aria-label={filterCount > 0 ? `Filters, ${filterCount} active` : "Filters"}
            >
              <Filter className="h-3.5 w-3.5" aria-hidden />
              Filters
              {filterCount > 0 ? (
                <Badge variant="default" className="ml-0.5 h-5 min-w-5 px-1.5 text-[10px]">
                  {filterCount}
                </Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={8}
            className="flex w-[min(calc(100vw-2rem),20.5rem)] max-h-[min(32rem,calc(100dvh-5rem))] flex-col overflow-hidden p-0"
            data-testid="approvals-filters-panel"
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
              {active ? (
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
                  value={projectIds}
                  onChange={(value) =>
                    onChange({ ...filters, projectId: value.length > 0 ? value : undefined })
                  }
                  options={projectOptions.map((option) => ({
                    value: option.value,
                    label: option.label
                  }))}
                  placeholder="All projects"
                  searchPlaceholder="Search projects…"
                  selectAllLabel="All projects"
                  disabled={loading}
                  aria-label="Project"
                  triggerClassName={triggerClass}
                  contentClassName="z-[80]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Member</Label>
                <SearchableMultiSelect
                  value={memberIds}
                  onChange={(value) =>
                    onChange({ ...filters, userId: value.length > 0 ? value : undefined })
                  }
                  options={memberOptions.map((option) => ({
                    value: option.value,
                    label: option.label
                  }))}
                  placeholder="All members"
                  searchPlaceholder="Search members…"
                  selectAllLabel="All members"
                  disabled={loading}
                  aria-label="Member"
                  triggerClassName={triggerClass}
                  contentClassName="z-[80]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Period range</Label>
                <DateRangePicker
                  from={filters.from ?? ""}
                  to={filters.to ?? ""}
                  onChange={(from, to) =>
                    onChange({ ...filters, from: from || undefined, to: to || undefined })
                  }
                  weekStartsOn={weekStartsOn}
                  ariaLabel="Filter by period start date"
                  className="w-full"
                  numberOfMonths={2}
                  popoverAlign="end"
                />
              </div>

              {showSort ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Sort</Label>
                  <Select
                    value={filters.sortOrder ?? "asc"}
                    onValueChange={(val) =>
                      onChange({ ...filters, sortOrder: val as "asc" | "desc" })
                    }
                  >
                    <SelectTrigger className={triggerClass} aria-label="Sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[80]">
                      <SelectItem value="asc">Submitted (oldest first)</SelectItem>
                      <SelectItem value="desc">Submitted (newest first)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
        {onViewModeChange && viewMode ? (
          <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div
          className="col-span-full flex min-w-0 items-center gap-2 border-t border-border/60 pt-2"
          data-testid="approvals-filters-applied"
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
      ) : null}
    </div>
  );
}
