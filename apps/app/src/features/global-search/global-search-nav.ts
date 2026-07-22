import type { AccountNavItem } from "@/config/account-nav";
import {
  ACCOUNT_NAV_ITEMS,
  ACCOUNT_NAV_SECTION_LABELS,
  ACCOUNT_NAV_SECTION_ORDER
} from "@/config/account-nav";
import type { AppNavItem } from "@/config/app-nav";
import { APP_NAV_ITEMS, APP_NAV_SECTION_LABELS, APP_NAV_SECTION_ORDER } from "@/config/app-nav";
import { isCommercialFeaturesEnabled } from "@/lib/commercial-features";

export type GlobalSearchResultType = "page" | "project" | "task" | "category" | "person";

export type GlobalSearchResult = {
  id: string;
  type: GlobalSearchResultType;
  label: string;
  subtitle?: string;
  href: string;
};

export type GlobalSearchViewAll = {
  type: Exclude<GlobalSearchResultType, "page">;
  label: string;
  href: string;
};

export type GlobalSearchPageGroup = {
  id: string;
  label: string;
  results: GlobalSearchResult[];
};

export const GLOBAL_SEARCH_MIN_QUERY_LENGTH = 2;
export const GLOBAL_SEARCH_RESULT_LIMIT = 5;
export const GLOBAL_SEARCH_DEBOUNCE_MS = 300;

function workspaceNavPool(): readonly AppNavItem[] {
  return isCommercialFeaturesEnabled()
    ? APP_NAV_ITEMS
    : APP_NAV_ITEMS.filter((item) => item.href !== "/billing");
}

function matchesQuery(
  item: { label: string; keywords?: readonly string[] },
  normalized: string
): boolean {
  if (!normalized) return true;
  if (item.label.toLowerCase().includes(normalized)) return true;
  return item.keywords?.some((keyword) => keyword.toLowerCase().includes(normalized)) ?? false;
}

export function filterAppNavItems(
  query: string,
  options?: { includeAccount?: boolean }
): AppNavItem[] {
  const normalized = query.trim().toLowerCase();
  const pool: (AppNavItem | AccountNavItem)[] = options?.includeAccount
    ? [...workspaceNavPool(), ...ACCOUNT_NAV_ITEMS]
    : [...workspaceNavPool()];

  return pool.filter((item) => matchesQuery(item, normalized)) as AppNavItem[];
}

export function filterAccountNavItems(query: string): AccountNavItem[] {
  const normalized = query.trim().toLowerCase();
  return ACCOUNT_NAV_ITEMS.filter((item) => matchesQuery(item, normalized));
}

export function toPageSearchResult(item: AppNavItem | AccountNavItem): GlobalSearchResult {
  return {
    id: `page:${item.href}`,
    type: "page",
    label: item.label,
    href: item.href
  };
}

export function buildWorkspacePageGroups(query: string): GlobalSearchPageGroup[] {
  const normalized = query.trim().toLowerCase();
  const items = workspaceNavPool().filter((item) => matchesQuery(item, normalized));

  return APP_NAV_SECTION_ORDER.flatMap((sectionId) => {
    const sectionItems = items.filter((item) => item.section === sectionId);
    if (sectionItems.length === 0) return [];
    return [
      {
        id: sectionId,
        label: APP_NAV_SECTION_LABELS[sectionId],
        results: sectionItems.map(toPageSearchResult)
      }
    ];
  });
}

export function buildAccountPageGroups(query: string): GlobalSearchPageGroup[] {
  const normalized = query.trim().toLowerCase();
  const items = ACCOUNT_NAV_ITEMS.filter((item) => matchesQuery(item, normalized));

  return ACCOUNT_NAV_SECTION_ORDER.flatMap((sectionId) => {
    const sectionItems = items.filter((item) => item.section === sectionId);
    if (sectionItems.length === 0) return [];
    return [
      {
        id: `account-${sectionId}`,
        label: ACCOUNT_NAV_SECTION_LABELS[sectionId],
        results: sectionItems.map(toPageSearchResult)
      }
    ];
  });
}

export function buildGlobalSearchPageGroups(
  query: string,
  options?: { includeAccount?: boolean }
): GlobalSearchPageGroup[] {
  const workspaceGroups = buildWorkspacePageGroups(query);
  if (!options?.includeAccount) return workspaceGroups;
  return [...workspaceGroups, ...buildAccountPageGroups(query)];
}
