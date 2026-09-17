"use client";

import { AppBarActionButton } from "@kloqra/ui";
import { LayoutGrid } from "lucide-react";
import type { ReactNode } from "react";

export type DashboardAppBarActionsProps = {
  customizing: boolean;
  onCustomize: () => void;
};

function ResponsiveLabel({ children }: { children: ReactNode }) {
  return <span className="hidden @min-[1200px]/shell:inline">{children}</span>;
}

export function DashboardAppBarActions({ customizing, onCustomize }: DashboardAppBarActionsProps) {
  return (
    <AppBarActionButton
      active={customizing}
      aria-label={customizing ? "Done customizing" : "Customize dashboard"}
      title={customizing ? "Done customizing" : "Customize dashboard"}
      onClick={onCustomize}
    >
      <LayoutGrid className="size-4" aria-hidden />
      <ResponsiveLabel>{customizing ? "Done" : "Customize"}</ResponsiveLabel>
    </AppBarActionButton>
  );
}
