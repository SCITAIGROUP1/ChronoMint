"use client";

import { MoreHorizontal, SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "../../lib/utils.js";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover.js";
import { AppBarFilterSheet } from "./app-bar-filter-sheet.js";

/** Shared width/height for filter selects in list page app bar toolbars. */
export const appBarListFilterTriggerClass = "h-10 w-full lg:w-[9.5rem]";

export type AppBarListToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel: string;
  filters?: ReactNode;
  /** Number of non-default filters — shown as a badge on the compact Filters button. */
  filterCount?: number;
  onClearFilters?: () => void;
  /** Primary CTA — always visible. */
  action?: ReactNode;
  /** Extra actions: overflow menu on compact viewports, inline on desktop. */
  moreActions?: ReactNode;
  className?: string;
};

/**
 * Standard list-page toolbar row for AppBar `secondary` — search, optional filters, optional CTA.
 * Below `lg`, filters move into a sheet and extra actions collapse into an overflow menu.
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
        "flex w-full min-w-0 flex-col gap-2 border-t border-border/60 pt-3 lg:flex-row lg:items-center lg:gap-2 lg:pt-4",
        className
      )}
    >
      <Input
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="h-10 w-full lg:max-w-xs lg:flex-1 xl:max-w-sm"
        aria-label={searchAriaLabel}
      />

      {hasFilters ? (
        <div className="hidden lg:contents" data-testid="app-bar-list-filters-desktop">
          {filters}
        </div>
      ) : null}

      <div className="flex min-w-0 items-center gap-2 lg:contents">
        {hasFilters ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 gap-2 lg:hidden"
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
              className="hidden lg:flex lg:items-center lg:gap-2"
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
                  className="h-10 w-10 shrink-0 lg:hidden"
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

        {action ? (
          <div className="min-w-0 flex-1 lg:ml-auto lg:w-auto lg:flex-none">{action}</div>
        ) : null}
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
