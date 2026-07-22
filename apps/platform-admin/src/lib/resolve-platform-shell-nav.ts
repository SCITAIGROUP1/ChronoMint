import type { SidebarNavItem, SidebarNavSection } from "@kloqra/ui";
import {
  PLATFORM_ACCOUNT_NAV_ITEMS,
  type PlatformAccountNavItem
} from "@/config/platform-account-nav";
import {
  PLATFORM_CONSOLE_NAV_ITEMS,
  PLATFORM_CONSOLE_SECTION_LABELS,
  PLATFORM_CONSOLE_SECTION_ORDER,
  type PlatformConsoleNavItem
} from "@/config/platform-console-nav";

export type PlatformShellMode = "account" | "console";

const CONSOLE_PATH_PREFIXES = [
  "/ops",
  "/tenants",
  "/subscriptions",
  "/plans",
  "/helpdesk",
  "/audit",
  "/notifications"
] as const;

export function isPlatformAccountPath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/settings");
}

export function resolvePlatformShellMode(pathname: string): PlatformShellMode {
  return isPlatformAccountPath(pathname) ? "account" : "console";
}

function mapAccountNav(items: readonly PlatformAccountNavItem[]): SidebarNavItem[] {
  return items.map((item) => ({
    href: item.href,
    label: item.label,
    Icon: item.Icon
  }));
}

function buildConsoleNavSections(
  items: readonly PlatformConsoleNavItem[],
  notificationUnreadCount: number
): SidebarNavSection[] {
  return PLATFORM_CONSOLE_SECTION_ORDER.flatMap((sectionId) => {
    const sectionItems = items.filter((item) => item.section === sectionId);
    if (sectionItems.length === 0) return [];
    return [
      {
        id: sectionId,
        label: PLATFORM_CONSOLE_SECTION_LABELS[sectionId],
        items: sectionItems.map((item) =>
          item.href === "/notifications" ? { ...item, badge: notificationUnreadCount } : item
        )
      }
    ];
  });
}

export function flattenNavSections(sections: readonly SidebarNavSection[]): SidebarNavItem[] {
  return sections.flatMap((section) => section.items);
}

export function resolvePlatformShellNav(options: {
  pathname: string;
  notificationUnreadCount: number;
  platformRole?: string;
}): { mode: PlatformShellMode; navSections: SidebarNavSection[] } {
  const mode = resolvePlatformShellMode(options.pathname);

  if (mode === "account") {
    return {
      mode,
      navSections: [
        { id: "account", label: "Account", items: mapAccountNav(PLATFORM_ACCOUNT_NAV_ITEMS) }
      ]
    };
  }

  let visibleItems: PlatformConsoleNavItem[] = [...PLATFORM_CONSOLE_NAV_ITEMS];

  if (options.platformRole === "SUPPORT") {
    const allowedHrefs = ["/helpdesk", "/notifications", "/profile", "/settings"];
    visibleItems = visibleItems.filter((item) => allowedHrefs.includes(item.href));
  }

  return {
    mode,
    navSections: buildConsoleNavSections(visibleItems, options.notificationUnreadCount)
  };
}

export function isConsolePath(pathname: string): boolean {
  if (pathname === "/") return true;
  return CONSOLE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
