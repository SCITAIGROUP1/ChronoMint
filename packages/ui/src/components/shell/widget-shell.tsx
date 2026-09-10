"use client";

import React, { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
import { Card, CardContent } from "../ui/card.js";
import {
  widgetShellTitleClass,
  widgetShellVariants,
  widgetShellViewToolbarClass
} from "./shell-styles.js";

export interface WidgetShellProps {
  id: string;
  label: string;
  isEditing: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  headerActions?: React.ReactNode;
  /** When false, the shell title is omitted in view mode (e.g. KPI cards with their own label). */
  showTitleInView?: boolean;
}

export const WidgetShell = forwardRef<HTMLDivElement, WidgetShellProps>(
  (
    { label, isEditing, children, className, style, headerActions, showTitleInView = true },
    ref
  ) => {
    const showViewTitle = showTitleInView && !isEditing;
    const showViewToolbar = Boolean(headerActions) && !isEditing;

    return (
      <Card
        ref={ref}
        style={style}
        className={cn(widgetShellVariants({ editing: isEditing }), className)}
      >
        <CardContent className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4">
          {isEditing ? (
            // Keep bottom/right edges free so react-grid-layout resize handles receive events.
            <div
              className="absolute top-0 left-0 z-20 cursor-grab active:cursor-grabbing bottom-3 right-3"
              aria-hidden
            />
          ) : null}

          {!isEditing && (showViewTitle || showViewToolbar) ? (
            <div
              className={cn(
                widgetShellViewToolbarClass,
                "shrink-0",
                !showViewTitle && "justify-end"
              )}
            >
              {showViewTitle ? <h3 className={widgetShellTitleClass}>{label}</h3> : null}
              {showViewToolbar ? (
                <div className="widget-no-drag ml-auto flex shrink-0 items-center gap-2">
                  {headerActions}
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            className={cn(
              "min-h-0 min-w-0 flex-1 overflow-hidden",
              isEditing && "pointer-events-none select-none"
            )}
          >
            {children}
          </div>
        </CardContent>
      </Card>
    );
  }
);

WidgetShell.displayName = "WidgetShell";
