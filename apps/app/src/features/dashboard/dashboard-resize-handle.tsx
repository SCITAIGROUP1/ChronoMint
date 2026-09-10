"use client";

import type { ReactElement, Ref } from "react";

type ResizeAxis = "s" | "w" | "e" | "n" | "sw" | "nw" | "se" | "ne";

/**
 * Visible resize affordance for react-grid-layout.
 * Class names must stay compatible with RGL / react-resizable.
 */
export function renderDashboardResizeHandle(axis: ResizeAxis, ref: Ref<HTMLElement>): ReactElement {
  const isCorner = axis.length === 2;
  return (
    <span
      ref={ref as Ref<HTMLSpanElement>}
      data-testid={`dashboard-resize-handle-${axis}`}
      className={`react-resizable-handle react-resizable-handle-${axis}`}
      aria-hidden
    >
      {isCorner ? (
        <span className="pointer-events-none absolute inset-0.5 rounded-br-md bg-primary/70 shadow-sm ring-1 ring-primary/40" />
      ) : null}
    </span>
  );
}
