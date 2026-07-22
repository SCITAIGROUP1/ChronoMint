"use client";

import { Menu, X, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import { cn } from "../lib/utils.js";
import { COMPACT_LAPTOP_VIEWPORT_MAX, SIDEBAR_COLLAPSED_STORAGE_KEY } from "../responsive-tiers.js";
import { resolveActiveNavHref } from "./resolve-active-nav-href.js";
import {
  shellMainClass,
  shellMainContentClass,
  shellMobileDrawerClass,
  shellMobileHeaderClass,
  shellSidebarClass,
  shellSidebarCollapsedWidthClass,
  shellSidebarExpandedWidthClass,
  shellSidebarFooterClass,
  shellSidebarFooterCollapsedClass,
  shellSidebarScrollClass,
  shellSidebarScrollCollapsedClass
} from "./shell/shell-styles.js";
import { ShellToolbarProvider, type ShellToolbarValue } from "./shell-toolbar-context.js";

export type SidebarNavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  tourId?: string;
};

export type SidebarNavSection = {
  id: string;
  label: string;
  items: readonly SidebarNavItem[];
};

function NavBadge({ badge, collapsed }: { badge: number | string; collapsed?: boolean }) {
  const count = typeof badge === "number" ? badge : parseInt(String(badge), 10);
  const showCount = !Number.isNaN(count) && count > 0;
  if (!showCount && badge === 0) return null;
  if (!showCount && !badge) return null;

  if (collapsed) {
    const label = showCount ? (count > 9 ? "9+" : count) : badge;
    const compact = String(label).length === 1;

    return (
      <span
        className={cn(
          "absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-amber-500 font-bold leading-none text-amber-950",
          compact ? "size-3 text-[7px]" : "h-3 min-w-[13px] px-0.5 text-[7px]"
        )}
        aria-hidden
      >
        {label}
      </span>
    );
  }

  return (
    <span className="ml-auto shrink-0 rounded-full border border-status-warning-border bg-status-warning-bg px-2 py-0.5 text-[10px] font-bold text-status-warning-fg">
      {showCount ? count : badge}
    </span>
  );
}

export type ResponsiveLayoutShellProps = {
  children: React.ReactNode;
  /** Flat nav list — use with optional `navSectionLabel`, or prefer `navSections`. */
  navItems?: readonly SidebarNavItem[];
  /** Grouped nav sections; empty sections are omitted at render time. */
  navSections?: readonly SidebarNavSection[];
  logoIcon: React.ReactNode;
  logoTitle: string;
  logoSubtitle: string;
  logoLinkHref: string;
  workspaceSwitcher: (collapsed: boolean) => React.ReactNode;
  footerContent: (collapsed: boolean) => React.ReactNode;
  impersonationBanner?: React.ReactNode;
  shellToolbar?: ShellToolbarValue;
  /** Uppercase label above flat `navItems` (ignored when `navSections` is set). */
  navSectionLabel?: string;
  /** Accessible name for the sidebar navigation region. */
  navAriaLabel?: string;
};

function resolveNavSections(
  navSections: readonly SidebarNavSection[] | undefined,
  navItems: readonly SidebarNavItem[] | undefined,
  navSectionLabel: string | undefined
): SidebarNavSection[] {
  if (navSections?.length) {
    return navSections.filter((section) => (section.items?.length ?? 0) > 0);
  }
  if (navItems?.length) {
    return [{ id: "default", label: navSectionLabel ?? "", items: navItems }];
  }
  return [];
}

function SidebarNavLink({
  href,
  label,
  Icon,
  badge,
  tourId,
  active,
  collapsed,
  onNavigate
}: SidebarNavItem & {
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const showBadge = badge !== undefined && badge !== "" && (typeof badge !== "number" || badge > 0);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      data-tour={tourId}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-[var(--motion-base)] ease-[var(--motion-ease-out)]",
        collapsed ? "h-9 w-9 shrink-0 justify-center p-0" : "gap-3 px-3 py-2.5",
        active
          ? "bg-primary/12 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
      )}
    >
      {active && (
        <span
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-[var(--motion-base)] ease-[var(--motion-ease-out)]",
            collapsed ? "h-8 w-1" : "h-6 w-1"
          )}
          aria-hidden
        />
      )}
      <span className={cn("relative shrink-0", collapsed && showBadge && "inline-flex")}>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          )}
          aria-hidden
        />
        {showBadge && collapsed && <NavBadge badge={badge} collapsed />}
      </span>
      <span
        className={cn(
          "transition-all duration-300 truncate origin-left flex-1 min-w-0",
          collapsed
            ? "opacity-0 w-0 scale-95 overflow-hidden absolute pointer-events-none"
            : "opacity-100"
        )}
      >
        {label}
      </span>
      {showBadge && !collapsed && <NavBadge badge={badge} />}
    </Link>
  );
}

function SidebarNavSections({
  sections,
  activeHref,
  collapsed,
  ariaLabel,
  onNavigate
}: {
  sections: readonly SidebarNavSection[];
  activeHref: string | null;
  collapsed: boolean;
  ariaLabel: string;
  onNavigate?: () => void;
}) {
  return (
    <nav
      className={cn("flex w-full flex-col", collapsed ? "items-center gap-1" : "gap-4")}
      aria-label={ariaLabel}
    >
      {sections.map((section) => (
        <div
          key={section.id}
          className={cn("flex w-full flex-col", collapsed ? "items-center gap-1" : "gap-0.5")}
        >
          {!collapsed && section.label ? (
            <p
              className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              aria-hidden
            >
              {section.label}
            </p>
          ) : null}
          {(section.items ?? []).map((item) => (
            <SidebarNavLink
              key={item.href}
              {...item}
              active={item.href === activeHref}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

export function ResponsiveLayoutShell({
  children,
  navItems,
  navSections,
  logoIcon,
  logoTitle,
  logoSubtitle,
  logoLinkHref,
  workspaceSwitcher,
  footerContent,
  impersonationBanner,
  shellToolbar,
  navSectionLabel,
  navAriaLabel = "Desktop Navigation"
}: ResponsiveLayoutShellProps) {
  const sections = resolveNavSections(navSections, navItems, navSectionLabel);
  const allHrefs = sections.flatMap((section) => (section.items ?? []).map((item) => item.href));
  const pathname = usePathname();
  const activeHref = resolveActiveNavHref(pathname, allHrefs);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load sidebar preference from localStorage after mounting; auto-collapse on compact laptops.
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === "true");
      return;
    }
    if (window.innerWidth < COMPACT_LAPTOP_VIEWPORT_MAX) {
      setIsCollapsed(true);
    }
  }, []);

  // Prevent background scrolling on mobile when drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
  };

  return (
    <div className="flex h-dvh overflow-hidden flex-col bg-background md:flex-row">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside
        className={cn(
          shellSidebarClass,
          isCollapsed ? shellSidebarCollapsedWidthClass : shellSidebarExpandedWidthClass
        )}
      >
        <div
          className={cn(
            isCollapsed ? shellSidebarScrollCollapsedClass : shellSidebarScrollClass,
            "gap-5"
          )}
        >
          {/* Brand + collapse */}
          <div
            className={cn(
              "w-full transition-all duration-300",
              isCollapsed ? "flex flex-col items-center gap-1.5" : "flex items-center gap-2"
            )}
          >
            <Link
              href={logoLinkHref}
              className={cn(
                "flex min-w-0 items-center rounded-xl transition-all duration-300",
                isCollapsed ? "justify-center p-0" : "flex-1 gap-3 py-0.5"
              )}
            >
              {logoIcon}
              <div
                className={cn(
                  "min-w-0 transition-all duration-300 ease-in-out origin-left",
                  isCollapsed
                    ? "opacity-0 w-0 scale-95 overflow-hidden absolute pointer-events-none"
                    : "opacity-100"
                )}
              >
                <p className="truncate text-sm font-medium tracking-tight">{logoTitle}</p>
                <p className="truncate text-xs text-muted-foreground">{logoSubtitle}</p>
              </div>
            </Link>
            {mounted ? (
              <button
                type="button"
                onClick={toggleCollapse}
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all duration-300 hover:bg-muted/50 hover:text-foreground focus:outline-none cursor-pointer",
                  isCollapsed ? "h-7 w-7" : "h-8 w-8 mr-0.5"
                )}
                style={{ transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              </button>
            ) : null}
          </div>

          {/* Workspace Switcher Slot */}
          <div className={cn("w-full", isCollapsed && "flex justify-center")}>
            {workspaceSwitcher(isCollapsed)}
          </div>

          {/* Navigation Links */}
          <SidebarNavSections
            sections={sections}
            activeHref={activeHref}
            collapsed={isCollapsed}
            ariaLabel={navAriaLabel}
          />
        </div>

        <div className={isCollapsed ? shellSidebarFooterCollapsedClass : shellSidebarFooterClass}>
          {footerContent(isCollapsed)}
        </div>
      </aside>

      {/* --- MOBILE NAVBAR --- */}
      <header className={shellMobileHeaderClass}>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href={logoLinkHref} className="flex items-center gap-2 font-medium">
          {logoIcon}
          <span className="text-sm tracking-tight">{logoTitle}</span>
        </Link>

        {/* Spacer to balance menu button */}
        <div className="w-10" />
      </header>

      {/* --- MOBILE SIDEBAR DRAWER --- */}
      {/* Drawer Overlay Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:hidden",
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Drawer Panel */}
      <aside
        className={cn(shellMobileDrawerClass, isMobileOpen ? "translate-x-0" : "-translate-x-full")}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50">
          <Link
            href={logoLinkHref}
            className="flex items-center gap-3 rounded-xl py-0.5"
            onClick={() => setIsMobileOpen(false)}
          >
            {logoIcon}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium tracking-tight">{logoTitle}</p>
              <p className="truncate text-xs text-muted-foreground">{logoSubtitle}</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-4">
          {workspaceSwitcher(false)}

          <SidebarNavSections
            sections={sections}
            activeHref={activeHref}
            collapsed={false}
            ariaLabel={navAriaLabel}
            onNavigate={() => setIsMobileOpen(false)}
          />
        </div>

        {/* Drawer Footer */}
        <div className="shrink-0 space-y-3 border-t border-border/70 pt-4">
          {footerContent(false)}
        </div>
      </aside>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className={shellMainClass}>
        {impersonationBanner}
        <ShellToolbarProvider toolbar={shellToolbar}>
          <div
            className={cn("@container/shell mx-auto w-full max-w-[1600px]", shellMainContentClass)}
          >
            {children}
          </div>
        </ShellToolbarProvider>
      </main>
    </div>
  );
}
