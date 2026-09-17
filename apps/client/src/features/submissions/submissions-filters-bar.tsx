"use client";

import {
  Button,
  DateRangePicker,
  SearchableMultiSelect,
  type SearchableMultiSelectOption
} from "@kloqra/ui";

export type SubmissionsFiltersBarProps = {
  rangeFrom: string;
  rangeTo: string;
  onRangeChange: (from: string, to: string) => void;
  weekStartsOn?: 0 | 1;
  projectFilter: string[];
  onProjectFilterChange: (value: string[]) => void;
  projectOptions: SearchableMultiSelectOption[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  resultCount?: number;
};

export function SubmissionsFiltersBar({
  rangeFrom,
  rangeTo,
  onRangeChange,
  weekStartsOn = 1,
  projectFilter,
  onProjectFilterChange,
  projectOptions,
  onClearFilters,
  hasActiveFilters
}: SubmissionsFiltersBarProps) {
  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
      <DateRangePicker
        from={rangeFrom}
        to={rangeTo}
        onChange={onRangeChange}
        weekStartsOn={weekStartsOn}
        ariaLabel="Filter by period start date"
        className="h-10 w-[16rem] shrink-0"
        numberOfMonths={1}
        popoverAlign="end"
      />
      <SearchableMultiSelect
        value={projectFilter}
        onChange={onProjectFilterChange}
        options={projectOptions}
        placeholder="All projects"
        searchPlaceholder="Search projects…"
        selectAllLabel="All projects"
        aria-label="Project"
        triggerClassName="bg-background h-10 w-[12rem] shrink-0 font-normal"
      />
      {hasActiveFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 shrink-0 text-xs"
          onClick={onClearFilters}
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
