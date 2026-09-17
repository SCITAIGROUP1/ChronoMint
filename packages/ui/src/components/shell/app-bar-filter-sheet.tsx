"use client";

import type { ReactNode } from "react";
import { AppModal } from "../ui/app-modal.js";
import { Button } from "../ui/button.js";

export type AppBarFilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterCount?: number;
  onClearFilters?: () => void;
  children: ReactNode;
};

/** Compact-viewport filter panel built on AppModal. */
export function AppBarFilterSheet({
  open,
  onOpenChange,
  filterCount = 0,
  onClearFilters,
  children
}: AppBarFilterSheetProps) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Filters"
      description={filterCount > 0 ? `${filterCount} active` : "Narrow this list."}
      size="sm"
      footer={
        <>
          {onClearFilters ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onClearFilters();
              }}
            >
              Clear
            </Button>
          ) : null}
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">{children}</div>
    </AppModal>
  );
}
