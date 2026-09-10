import type { AuthSessionDto, Permission } from "@kloqra/contracts";
import type { SidebarNavItem, SidebarNavSection } from "@kloqra/ui";
import {
  ACCOUNT_NAV_SECTION_LABELS,
  ACCOUNT_NAV_SECTION_ORDER,
  type AccountNavItem
} from "@/config/account-nav";
import {
  APP_NAV_SECTION_LABELS,
  APP_NAV_SECTION_ORDER,
  filterNavByCapabilities,
  type AppNavItem
} from "@/config/app-nav";
import { projectLeadNavItems } from "@/config/project-manager-nav";
import { resolveAccountNavItems } from "@/lib/resolve-account-nav";

export type AppShellMode = "account" | "workspace";

export function isAccountModePath(pathname: string): boolean {
  if (pathname === "/account" || pathname.startsWith("/account/")) return true;
  return false;
}

export function resolveAppShellMode(
  pathname: string,
  _session?: Pick<AuthSessionDto, "tenantRole"> | null
): AppShellMode {
  return isAccountModePath(pathname) ? "account" : "workspace";
}

function mapNavItem(item: AppNavItem | AccountNavItem): SidebarNavItem {
  return {
    href: item.href,
    label: item.label,
    Icon: item.Icon,
    tourId: "tourId" in item ? item.tourId : undefined
  };
}

function buildAccountNavSections(items: readonly AccountNavItem[]): SidebarNavSection[] {
  return ACCOUNT_NAV_SECTION_ORDER.flatMap((sectionId) => {
    const sectionItems = items.filter((item) => item.section === sectionId);
    if (sectionItems.length === 0) return [];
    return [
      {
        id: sectionId,
        label: ACCOUNT_NAV_SECTION_LABELS[sectionId],
        items: sectionItems.map(mapNavItem)
      }
    ];
  });
}

/** Section headings only help when Workspace/My time/Support coexist. */
function unlabeledIfSingleSection(sections: SidebarNavSection[]): SidebarNavSection[] {
  if (sections.length !== 1) return sections;
  const [only] = sections;
  return only ? [{ ...only, label: "" }] : sections;
}

function buildWorkspaceNavSections(
  items: readonly AppNavItem[],
  badges: { pendingCount: number; notificationUnreadCount: number; projectCount: number }
): SidebarNavSection[] {
  return APP_NAV_SECTION_ORDER.flatMap((sectionId) => {
    const sectionItems = items.filter((item) => item.section === sectionId);
    if (sectionItems.length === 0) return [];
    return [
      {
        id: sectionId,
        label: APP_NAV_SECTION_LABELS[sectionId],
        items: sectionItems.map((item) => {
          const mapped = mapNavItem(item);
          if (item.href === "/projects") return { ...mapped, badge: badges.projectCount };
          if (item.href === "/approvals") return { ...mapped, badge: badges.pendingCount };
          if (item.href === "/notifications") {
            return { ...mapped, badge: badges.notificationUnreadCount };
          }
          return mapped;
        })
      }
    ];
  });
}

export function resolveAppShellNav(options: {
  pathname: string;
  projectLeadOnly: boolean;
  workspaceNavItems: readonly AppNavItem[];
  pendingCount: number;
  notificationUnreadCount: number;
  /** Projects visible to the user in the active workspace (admins: all; PMs: managed). */
  projectCount?: number;
  session: Pick<AuthSessionDto, "tenantRole"> | null | undefined;
  capabilities?: readonly Permission[];
}): { mode: AppShellMode; navSections: SidebarNavSection[] } {
  const mode = resolveAppShellMode(options.pathname, options.session);

  if (mode === "account") {
    return {
      mode,
      navSections: unlabeledIfSingleSection(
        buildAccountNavSections(resolveAccountNavItems(options.session))
      )
    };
  }

  const baseItems = options.capabilities
    ? filterNavByCapabilities(options.workspaceNavItems, options.capabilities)
    : options.projectLeadOnly
      ? projectLeadNavItems()
      : options.workspaceNavItems;

  return {
    mode,
    navSections: unlabeledIfSingleSection(
      buildWorkspaceNavSections(baseItems, {
        pendingCount: options.pendingCount,
        notificationUnreadCount: options.notificationUnreadCount,
        projectCount: options.projectCount ?? 0
      })
    )
  };
}

export function flattenNavSections(sections: readonly SidebarNavSection[]): SidebarNavItem[] {
  return sections.flatMap((section) => section.items);
}
