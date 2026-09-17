"use client";

import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";
import {
  AppModal,
  Button,
  DateRangePicker,
  SearchableMultiSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn
} from "@kloqra/ui";
import { hasActiveApprovalsFilter } from "@kloqra/web-shared";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
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

function FilterFieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

export function ApprovalsFiltersBar({
  filters,
  onChange,
  onClear,
  projectOptions,
  memberOptions,
  loading = false,
  resultCount,
  showSort = false,
  viewMode,
  onViewModeChange,
  weekStartsOn = 1
}: ApprovalsFiltersBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const active = hasActiveApprovalsFilter(filters);
  const filterCount =
    (filters.projectId && filters.projectId.length > 0 ? 1 : 0) +
    (filters.userId && filters.userId.length > 0 ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0);

  const fields = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-2">
        <FilterFieldLabel>Project</FilterFieldLabel>
        <SearchableMultiSelect
          value={filters.projectId ?? []}
          onChange={(value) =>
            onChange({ ...filters, projectId: value.length > 0 ? value : undefined })
          }
          options={projectOptions.map((option) => ({ value: option.value, label: option.label }))}
          placeholder="All projects"
          searchPlaceholder="Search projects…"
          selectAllLabel="All projects"
          disabled={loading}
          aria-label="Project"
          triggerClassName="bg-background h-10 w-full font-normal"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <FilterFieldLabel>Member</FilterFieldLabel>
        <SearchableMultiSelect
          value={filters.userId ?? []}
          onChange={(value) =>
            onChange({ ...filters, userId: value.length > 0 ? value : undefined })
          }
          options={memberOptions.map((option) => ({ value: option.value, label: option.label }))}
          placeholder="All members"
          searchPlaceholder="Search members…"
          selectAllLabel="All members"
          disabled={loading}
          aria-label="Member"
          triggerClassName="bg-background h-10 w-full font-normal"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <FilterFieldLabel>Period range</FilterFieldLabel>
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
    </div>
  );

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-border/40">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-xs text-muted-foreground">
          {typeof resultCount === "number"
            ? `${resultCount} result${resultCount === 1 ? "" : "s"}`
            : "Filter by project, member, or period start date"}
        </p>
        {showSort ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Sort:</span>
            <Select
              value={filters.sortOrder ?? "asc"}
              onValueChange={(val) => onChange({ ...filters, sortOrder: val as "asc" | "desc" })}
            >
              <SelectTrigger className="h-8 text-xs font-semibold bg-background w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Submitted (oldest first)</SelectItem>
                <SelectItem value="desc">Submitted (newest first)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {onViewModeChange && viewMode ? (
          <div className="flex items-center rounded-lg border bg-background p-0.5 mr-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 rounded-md",
                viewMode === "card" && "bg-muted text-foreground"
              )}
              onClick={() => onViewModeChange("card")}
              title="Card view"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 rounded-md",
                viewMode === "table" && "bg-muted text-foreground"
              )}
              onClick={() => onViewModeChange("table")}
              title="Table view"
            >
              <List className="size-4" />
            </Button>
          </div>
        ) : null}
        {active ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onClear}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-2 lg:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2"
          onClick={() => setFiltersOpen(true)}
          aria-label={filterCount > 0 ? `Filters, ${filterCount} active` : "Filters"}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters
          {filterCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {filterCount}
            </span>
          ) : null}
        </Button>
        {onViewModeChange && viewMode ? (
          <div className="ml-auto flex items-center rounded-lg border bg-background p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 rounded-md",
                viewMode === "card" && "bg-muted text-foreground"
              )}
              onClick={() => onViewModeChange("card")}
              title="Card view"
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 rounded-md",
                viewMode === "table" && "bg-muted text-foreground"
              )}
              onClick={() => onViewModeChange("table")}
              title="Table view"
            >
              <List className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      <div className="hidden rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4 space-y-3 lg:block">
        {fields}
        {footer}
      </div>

      <AppModal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filters"
        description={filterCount > 0 ? `${filterCount} active` : "Narrow this list."}
        size="md"
        footer={
          <>
            {active ? (
              <Button type="button" variant="ghost" onClick={onClear}>
                Clear
              </Button>
            ) : null}
            <Button type="button" onClick={() => setFiltersOpen(false)}>
              Done
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {fields}
          {showSort ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium shrink-0">Sort:</span>
              <Select
                value={filters.sortOrder ?? "asc"}
                onValueChange={(val) => onChange({ ...filters, sortOrder: val as "asc" | "desc" })}
              >
                <SelectTrigger className="h-8 text-xs font-semibold bg-background w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Submitted (oldest first)</SelectItem>
                  <SelectItem value="desc">Submitted (newest first)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </AppModal>
    </>
  );
}
