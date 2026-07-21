import type { AccountNavItem } from "@/config/account-nav";
import { ACCOUNT_NAV_ITEMS } from "@/config/account-nav";
import type { AppNavItem } from "@/config/app-nav";
import { APP_NAV_ITEMS } from "@/config/app-nav";
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

export const GLOBAL_SEARCH_MIN_QUERY_LENGTH = 2;
export const GLOBAL_SEARCH_RESULT_LIMIT = 5;
export const GLOBAL_SEARCH_DEBOUNCE_MS = 300;

function workspaceNavPool(): readonly AppNavItem[] {
  return isCommercialFeaturesEnabled()
    ? APP_NAV_ITEMS
    : APP_NAV_ITEMS.filter((item) => item.href !== "/billing");
}

export function filterAppNavItems(
  query: string,
  options?: { includeAccount?: boolean }
): AppNavItem[] {
  const normalized = query.trim().toLowerCase();
  const pool: (AppNavItem | AccountNavItem)[] = options?.includeAccount
    ? [...workspaceNavPool(), ...ACCOUNT_NAV_ITEMS]
    : [...workspaceNavPool()];

  if (!normalized) return pool as AppNavItem[];

  return pool.filter((item) => {
    if (item.label.toLowerCase().includes(normalized)) return true;
    const keywords = "keywords" in item ? item.keywords : undefined;
    return keywords?.some((keyword) => keyword.toLowerCase().includes(normalized)) ?? false;
  }) as AppNavItem[];
}

export function toPageSearchResult(item: AppNavItem): GlobalSearchResult {
  return {
    id: `page:${item.href}`,
    type: "page",
    label: item.label,
    href: item.href
  };
}
