"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils.js";
import {
  isShellToolbarParts,
  resolveShellToolbar,
  useShellToolbar
} from "../shell-toolbar-context.js";
import { AppBarToolbar } from "./app-bar-toolbar.js";
import { useRegisterShellPageTitle } from "./shell-page-title-context.js";
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
  /** Plain-text title for the compact shell header when `title` is not a string. */
  titleLabel?: string;
  description?: ReactNode;
  /** Page-specific actions shown before the global shell toolbar (bell, theme, avatar). */
  actions?: ReactNode;
  /** Optional second row — search, filters, primary CTA, etc. */
  secondary?: ReactNode;
  className?: string;
};

function AppBarTitle({ title }: { title: ReactNode }) {
  if (typeof title === "string") {
    return <h1 className={shellAppBarTitleClass}>{title}</h1>;
  }
  return <div className={shellAppBarTitleClass}>{title}</div>;
}

/**
 * Sticky page app bar used across admin/client shells.
 * Shell toolbar actions are injected automatically via `ShellToolbarProvider`.
 * On compact viewports the title and shell icons live in the shell mobile header instead.
 */
export function AppBar({
  title,
  titleLabel,
  description,
  actions,
  secondary,
  className
}: AppBarProps) {
  useRegisterShellPageTitle(title, titleLabel);
  const shellToolbar = useShellToolbar();
  const structured = shellToolbar != null && isShellToolbarParts(shellToolbar);
  const {
    search: shellSearch,
    actions: shellActions,
    legacy
  } = structured
    ? resolveShellToolbar(shellToolbar)
    : { search: null, actions: shellToolbar ?? null, legacy: true as const };

  const hasCompactPrimary = Boolean(actions);
  const hasCompactChrome = hasCompactPrimary || Boolean(secondary);
  const desktopShellActions = shellActions ? (
    <div className="hidden lg:flex">{shellActions}</div>
  ) : null;

  if (legacy) {
    const hasTrailing = Boolean(actions || shellActions);

    return (
      <header
        className={cn(shellAppBarClass, !hasCompactChrome && "hidden lg:block", className)}
        data-compact-chrome={hasCompactChrome ? "true" : "false"}
      >
        <div className="flex w-full flex-col gap-3 lg:gap-4">
          <div className={cn(shellAppBarPrimaryRowClass, !hasCompactPrimary && "hidden lg:flex")}>
            <div className="hidden min-w-0 space-y-1 lg:block">
              <AppBarTitle title={title} />
              {description ? (
                <div className={shellAppBarDescriptionClass}>{description}</div>
              ) : null}
            </div>
            {hasTrailing ? (
              <div className="flex w-full min-w-0 justify-end @min-[640px]/shell:w-auto @min-[640px]/shell:shrink-0">
                <AppBarToolbar
                  pageActions={actions}
                  shellActions={desktopShellActions}
                  className="w-full justify-end @min-[640px]/shell:w-auto"
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
    <header
      className={cn(shellAppBarClass, !hasCompactChrome && "hidden lg:block", className)}
      data-compact-chrome={hasCompactChrome ? "true" : "false"}
    >
      <div className="flex w-full flex-col gap-3">
        <div className={cn(shellAppBarPrimaryRowClass, !hasCompactPrimary && "hidden lg:flex")}>
          <div className="hidden min-w-0 space-y-1 lg:block">
            <AppBarTitle title={title} />
            {description ? <div className={shellAppBarDescriptionClass}>{description}</div> : null}
          </div>
          {hasShellActions ? (
            <div className="hidden w-full shrink-0 justify-end self-stretch lg:flex @min-[640px]/shell:w-auto @min-[720px]/shell:self-center">
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
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:pt-4",
        className
      )}
    >
      {leading ? (
        <div className="flex min-w-0 w-full flex-1 items-center sm:w-auto">{leading}</div>
      ) : null}
      {trailing ? (
        <div className="flex w-full min-w-0 shrink-0 items-center justify-stretch gap-2 overflow-x-auto sm:w-auto sm:justify-end">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
