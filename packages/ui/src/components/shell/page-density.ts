/**
 * Content-first density tokens for compact laptops and tablet landscape.
 * Page internals should use @container/shell, not viewport lg/xl.
 */

export const controlHeightClass = "h-10";
export const iconSizeClass = "size-4";
export const appBarIconGlyphClass = "size-5";
/** Primary/outline page CTAs in the app bar toolbar (New project, Add category, …). */
export const appBarPageActionClass = `${controlHeightClass} shrink-0 gap-2`;

export const pageBodyClass = "flex min-h-0 flex-1 flex-col gap-4";
export const pageMainClass = "flex min-h-0 flex-1 flex-col";
export const pageLayoutClass = "flex min-h-0 flex-1 flex-col gap-4";
export const pageBottomSafeClass = "pb-6";

export const compactCardClass = "gap-0 py-0";

export const statStripClass =
  "flex shrink-0 gap-2 overflow-x-auto [&>*]:min-w-[9.5rem] [&>*]:flex-1";

export const dataTableCardFillClass = "flex min-h-0 flex-1 flex-col";
export const dataTableScrollClass = "min-h-0 flex-1 overflow-auto";
export const dataTablePaginationClass = "shrink-0";
/** Hide status/meta columns until the compact-laptop shell band. */
export const dataTableMetaColClass = "hidden @min-[960px]/shell:table-cell";
export const dataTableStickyColClass =
  "sticky left-0 z-[1] bg-card shadow-[1px_0_0_0_hsl(var(--border))]";

export const pageAppBarClass = "mb-0";
