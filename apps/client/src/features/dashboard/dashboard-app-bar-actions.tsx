"use client";

import { AppBarActionButton } from "@kloqra/ui";
import { Download, LayoutGrid, Move, Upload } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type DashboardAppBarActionsProps = {
  canImport: boolean;
  exportUrl: string | null;
  catalogOpen: boolean;
  arranging: boolean;
  onImport: () => void;
  onAddWidgets: () => void;
  onArrange: () => void;
};

function ResponsiveLabel({ children }: { children: ReactNode }) {
  return <span className="hidden @min-[1200px]/shell:inline">{children}</span>;
}

export function DashboardAppBarActions({
  canImport,
  exportUrl,
  catalogOpen,
  arranging,
  onImport,
  onAddWidgets,
  onArrange
}: DashboardAppBarActionsProps) {
  return (
    <>
      {canImport ? (
        <AppBarActionButton
          aria-label="Import time entries"
          title="Import time entries"
          onClick={onImport}
        >
          <Upload className="size-4" aria-hidden />
          <ResponsiveLabel>Import</ResponsiveLabel>
        </AppBarActionButton>
      ) : null}
      {exportUrl ? (
        <AppBarActionButton asChild>
          <Link href={exportUrl} aria-label="Export this period" title="Export this period">
            <Download className="size-4" aria-hidden />
            <ResponsiveLabel>Export</ResponsiveLabel>
          </Link>
        </AppBarActionButton>
      ) : null}
      <AppBarActionButton
        active={catalogOpen}
        aria-label={catalogOpen ? "Close widget catalog" : "Add widgets"}
        title={catalogOpen ? "Close widget catalog" : "Add widgets"}
        onClick={onAddWidgets}
      >
        <LayoutGrid className="size-4" aria-hidden />
        <ResponsiveLabel>{catalogOpen ? "Close Widgets" : "Add Widgets"}</ResponsiveLabel>
      </AppBarActionButton>
      <AppBarActionButton
        active={arranging}
        aria-label={arranging ? "Done arranging" : "Arrange grid"}
        title={arranging ? "Done arranging" : "Arrange grid"}
        onClick={onArrange}
      >
        <Move className="size-4" aria-hidden />
        <ResponsiveLabel>{arranging ? "Done" : "Arrange"}</ResponsiveLabel>
      </AppBarActionButton>
    </>
  );
}
