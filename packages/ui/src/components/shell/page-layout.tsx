"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/utils.js";
import { AppBar, type AppBarProps } from "./app-bar.js";
import {
  pageAppBarClass,
  pageBottomSafeClass,
  pageLayoutClass,
  pageMainClass
} from "./page-density.js";

export type PageLayoutProps = {
  title: AppBarProps["title"];
  titleLabel?: AppBarProps["titleLabel"];
  description?: AppBarProps["description"];
  actions?: AppBarProps["actions"];
  secondary?: AppBarProps["secondary"];
  stats?: ReactNode;
  children: ReactNode;
  /** `main` fills leftover height and scrolls inside the core slot. `page` scrolls the whole column (settings/forms). */
  scroll?: "main" | "page";
  className?: string;
  "data-testid"?: string;
};

export function PageLayout({
  title,
  titleLabel,
  description,
  actions,
  secondary,
  stats,
  children,
  scroll = "main",
  className,
  "data-testid": dataTestId
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        pageLayoutClass,
        pageBottomSafeClass,
        scroll === "page" && "overflow-y-auto",
        className
      )}
      data-testid={dataTestId ?? "page-layout"}
      data-scroll={scroll}
    >
      <AppBar
        title={title}
        titleLabel={titleLabel}
        description={description}
        actions={actions}
        secondary={secondary}
        className={pageAppBarClass}
      />
      {stats ? <div className="shrink-0">{stats}</div> : null}
      <div
        className={cn(pageMainClass, scroll === "page" ? "flex-none" : "overflow-y-auto")}
        data-testid="page-layout-main"
      >
        {children}
      </div>
    </div>
  );
}
