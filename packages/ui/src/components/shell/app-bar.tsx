"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils.js";
import {
  isShellToolbarParts,
  resolveShellToolbar,
  useShellToolbar
} from "../shell-toolbar-context.js";
import { AppBarToolbar } from "./app-bar-toolbar.js";
import {
  shellAppBarClass,
  shellAppBarDescriptionClass,
  shellAppBarPrimaryRowClass,
  shellAppBarSecondaryRowClass,
  shellAppBarTitleClass,
  shellAppBarUtilityRowClass
} from "./shell-styles.js";

export type AppBarProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Page-specific actions shown before the global shell toolbar (bell, theme, avatar). */
  actions?: ReactNode;
  /** Optional second row — search, filters, primary CTA, etc. */
  secondary?: ReactNode;
  className?: string;
};

/**
 * Sticky page app bar used across admin/client shells.
 * Shell toolbar actions are injected automatically via `ShellToolbarProvider`.
 */
export function AppBar({ title, description, actions, secondary, className }: AppBarProps) {
  const shellToolbar = useShellToolbar();
  const structured = shellToolbar != null && isShellToolbarParts(shellToolbar);
  const {
    search: shellSearch,
    actions: shellActions,
    legacy
  } = structured
    ? resolveShellToolbar(shellToolbar)
    : { search: null, actions: shellToolbar ?? null, legacy: true as const };

  if (legacy) {
    const hasTrailing = Boolean(actions || shellActions);

    return (
      <header className={cn(shellAppBarClass, className)}>
        <div className="flex w-full flex-col gap-4">
          <div className={shellAppBarPrimaryRowClass}>
            <div className="min-w-0 space-y-1">
              {typeof title === "string" ? (
                <h1 className={shellAppBarTitleClass}>{title}</h1>
              ) : (
                <div className={shellAppBarTitleClass}>{title}</div>
              )}
              {description ? (
                <div className={shellAppBarDescriptionClass}>{description}</div>
              ) : null}
            </div>
            {hasTrailing ? (
              <div className="flex w-full min-w-0 @min-[720px]/shell:w-auto @min-[720px]/shell:shrink-0">
                <AppBarToolbar
                  pageActions={actions}
                  shellActions={shellActions ?? undefined}
                  className="w-full justify-end @min-[720px]/shell:w-auto"
                />
              </div>
            ) : null}
          </div>
          {secondary ? <div className={shellAppBarSecondaryRowClass}>{secondary}</div> : null}
        </div>
      </header>
    );
  }

  const hasUtilityRow = Boolean(actions || shellSearch);
  const hasShellActions = Boolean(shellActions);

  return (
    <header className={cn(shellAppBarClass, className)}>
      <div className="flex w-full flex-col gap-3">
        <div className={shellAppBarPrimaryRowClass}>
          <div className="min-w-0 space-y-1">
            {typeof title === "string" ? (
              <h1 className={shellAppBarTitleClass}>{title}</h1>
            ) : (
              <div className={shellAppBarTitleClass}>{title}</div>
            )}
            {description ? <div className={shellAppBarDescriptionClass}>{description}</div> : null}
          </div>
          {hasShellActions ? (
            <div className="flex shrink-0 self-start @min-[720px]/shell:self-center">
              {shellActions}
            </div>
          ) : null}
        </div>

        {hasUtilityRow ? (
          <div className={shellAppBarUtilityRowClass}>
            {shellSearch ? (
              <div className="min-w-0 w-full @min-[720px]/shell:max-w-sm @min-[960px]/shell:max-w-md">
                {shellSearch}
              </div>
            ) : null}
            {actions ? (
              <div className="flex flex-wrap items-center justify-start gap-2 @min-[720px]/shell:justify-end @min-[720px]/shell:ml-auto">
                {actions}
              </div>
            ) : null}
          </div>
        ) : null}

        {secondary ? <div className={shellAppBarSecondaryRowClass}>{secondary}</div> : null}
      </div>
    </header>
  );
}

export type AppBarSecondaryProps = {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

/** Layout helper for the app bar second row (search left, CTA right). */
export function AppBarSecondary({ leading, trailing, className }: AppBarSecondaryProps) {
  if (!leading && !trailing) return null;

  return (
    <>
      {leading ? <div className={cn("min-w-0 flex-1", className)}>{leading}</div> : null}
      {trailing ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{trailing}</div>
      ) : null}
    </>
  );
}
