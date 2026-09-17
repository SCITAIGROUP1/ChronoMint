"use client";

import { MoreHorizontal, SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "../../lib/utils.js";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover.js";
import { AppBarFilterSheet } from "./app-bar-filter-sheet.js";

/** Shared width/height for filter selects in list page app bar toolbars. */
export const appBarListFilterTriggerClass =
  "h-10 w-full min-w-0 @min-[960px]/shell:max-w-[9.5rem] @min-[960px]/shell:flex-none";

export const appBarListActionsClass = "ml-auto flex min-w-0 shrink-0 items-center gap-2";

export type AppBarListToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel: string;
  filters?: ReactNode;
  /** Number of non-default filters — shown as a badge on the compact Filters button. */
  filterCount?: number;
  onClearFilters?: () => void;
  /** Primary CTA — always visible at the trailing end. */
  action?: ReactNode;
  /** Extra actions: overflow menu on compact viewports, inline on desktop. */
  moreActions?: ReactNode;
  className?: string;
};

/**
 * Standard list-page toolbar row for AppBar `secondary` — search and filters
 * stay leading; page actions pin to the trailing end.
 */
export function AppBarListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  searchAriaLabel,
  filters,
  filterCount = 0,
  onClearFilters,
  action,
  moreActions,
  className
}: AppBarListToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasFilters = Boolean(filters);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-nowrap items-center gap-2 border-t border-border/60 pt-4",
        className
      )}
      data-testid="app-bar-list-toolbar"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2" data-testid="app-bar-list-leading">
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 min-w-0 flex-1 @min-[960px]/shell:max-w-xs @min-[960px]/shell:flex-none"
          aria-label={searchAriaLabel}
        />

        {hasFilters ? (
          <div
            className="hidden items-center gap-2 @min-[960px]/shell:flex"
            data-testid="app-bar-list-filters-desktop"
          >
            {filters}
          </div>
        ) : null}
      </div>

      <div className={appBarListActionsClass} data-testid="app-bar-list-actions">
        {hasFilters ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 gap-2 @min-[960px]/shell:hidden"
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
        ) : null}

        {moreActions ? (
          <>
            <div
              className="hidden items-center gap-2 @min-[960px]/shell:flex"
              data-testid="app-bar-more-actions-desktop"
            >
              {moreActions}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 @min-[960px]/shell:hidden"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2">
                <div className="flex flex-col gap-2">{moreActions}</div>
              </PopoverContent>
            </Popover>
          </>
        ) : null}

        {action ? <div className="min-w-0 shrink-0">{action}</div> : null}
      </div>

      {hasFilters ? (
        <AppBarFilterSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          filterCount={filterCount}
          onClearFilters={onClearFilters}
        >
          {filters}
        </AppBarFilterSheet>
      ) : null}
    </div>
  );
}
