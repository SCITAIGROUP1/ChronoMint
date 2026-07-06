import type { TimesheetApprovalsFilterQuery } from "@kloqra/contracts";

/** Default page size for approvals tables (smaller than generic tables so pagination is usable). */
export const APPROVALS_TABLE_PAGE_SIZE = 10;

export type MemberSubmissionsTab = "action" | "pending" | "approved" | "rejected" | "all";

export type MemberSubmissionsDeepLink = {
  projectId?: string;
  periodStart?: string;
  highlight?: "remind" | "rejected" | "amendment-approved";
  tab?: MemberSubmissionsTab;
};

export type AdminApprovalsDeepLink = {
  tab?: "review" | "missing" | "amendments" | "approved" | "rejected" | "all";
  periodId?: string;
  amendmentId?: string;
  batch?: string;
  projectId?: string;
  userId?: string;
  from?: string;
  to?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
};

export function resolveMemberSubmissionsTab(
  deepLink: MemberSubmissionsDeepLink
): MemberSubmissionsTab {
  if (deepLink.tab) return deepLink.tab;
  if (deepLink.highlight === "rejected") return "rejected";
  if (deepLink.highlight === "amendment-approved") return "approved";
  return "all";
}

export function buildMemberSubmissionsHref(params: MemberSubmissionsDeepLink): string {
  const search = new URLSearchParams();
  if (params.projectId) search.set("projectId", params.projectId);
  if (params.periodStart) search.set("periodStart", params.periodStart);
  if (params.highlight) search.set("highlight", params.highlight);
  if (params.tab && params.tab !== "all") search.set("tab", params.tab);
  const q = search.toString();
  return q ? `/submissions?${q}` : "/submissions";
}

export function buildAdminApprovalsHref(params: AdminApprovalsDeepLink): string {
  const search = new URLSearchParams();
  if (params.tab) search.set("tab", params.tab);
  if (params.periodId) search.set("periodId", params.periodId);
  if (params.amendmentId) search.set("amendmentId", params.amendmentId);
  if (params.batch) search.set("batch", params.batch);
  if (params.projectId) search.set("projectId", params.projectId);
  if (params.userId) search.set("userId", params.userId);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.sortOrder) search.set("sortOrder", params.sortOrder);
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  const q = search.toString();
  return q ? `/approvals?${q}` : "/approvals";
}

export function parseMemberSubmissionsSearch(search: string): MemberSubmissionsDeepLink {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const highlight = params.get("highlight");
  const tab = params.get("tab");
  return {
    projectId: params.get("projectId") ?? undefined,
    periodStart: params.get("periodStart") ?? undefined,
    highlight:
      highlight === "remind" || highlight === "rejected" || highlight === "amendment-approved"
        ? highlight
        : undefined,
    tab:
      tab === "action" ||
      tab === "pending" ||
      tab === "approved" ||
      tab === "rejected" ||
      tab === "all"
        ? tab
        : undefined
  };
}

export function parseAdminApprovalsSearch(search: string): AdminApprovalsDeepLink {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const tab = params.get("tab");
  const pageRaw = params.get("page");
  const limitRaw = params.get("limit");
  return {
    tab:
      tab === "review" ||
      tab === "missing" ||
      tab === "amendments" ||
      tab === "approved" ||
      tab === "rejected" ||
      tab === "all"
        ? tab
        : undefined,
    periodId: params.get("periodId") ?? undefined,
    amendmentId: params.get("amendmentId") ?? undefined,
    batch: params.get("batch") ?? undefined,
    projectId: params.get("projectId") ?? undefined,
    userId: params.get("userId") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    sortOrder: params.get("sortOrder") ?? undefined,
    page: pageRaw ? Number(pageRaw) : undefined,
    limit: limitRaw ? Number(limitRaw) : undefined
  };
}

export function parseApprovalsFilterSearch(search: string): TimesheetApprovalsFilterQuery {
  const params = parseAdminApprovalsSearch(search);
  const sortOrderRaw = params.sortOrder;
  const sortOrder = sortOrderRaw === "asc" || sortOrderRaw === "desc" ? sortOrderRaw : undefined;
  return {
    projectId: params.projectId
      ? params.projectId
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    userId: params.userId
      ? params.userId
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
    from: params.from,
    to: params.to,
    sortOrder,
    page: params.page,
    limit: params.limit
  };
}

export function appendApprovalsFilterSearch(
  params: URLSearchParams,
  filter: TimesheetApprovalsFilterQuery
): void {
  for (const key of ["projectId", "userId", "from", "to", "sortOrder", "page", "limit"] as const) {
    const value = filter[key];
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(","));
        } else {
          params.delete(key);
        }
      } else {
        params.set(key, String(value));
      }
    } else params.delete(key);
  }
}

export function buildApprovalsFilterQueryString(filter: TimesheetApprovalsFilterQuery): string {
  const params = new URLSearchParams();
  appendApprovalsFilterSearch(params, filter);
  return params.toString();
}

export function withApprovalsListPagination(
  filter: TimesheetApprovalsFilterQuery,
  overrides?: Pick<TimesheetApprovalsFilterQuery, "page" | "limit">
): TimesheetApprovalsFilterQuery {
  return {
    ...filter,
    page: filter.page ?? overrides?.page ?? 1,
    limit: filter.limit ?? overrides?.limit ?? APPROVALS_TABLE_PAGE_SIZE
  };
}

/** List fetches always include page + limit so server pagination is active. */
export function buildApprovalsListQueryString(filter: TimesheetApprovalsFilterQuery): string {
  return buildApprovalsFilterQueryString(withApprovalsListPagination(filter));
}

/** Count/badge fetches request one row and read `total` from the response meta. */
export function buildApprovalsCountQueryString(filter: TimesheetApprovalsFilterQuery = {}): string {
  return buildApprovalsFilterQueryString(
    withApprovalsListPagination(filter, { page: 1, limit: 1 })
  );
}

export function hasActiveApprovalsFilter(filter: TimesheetApprovalsFilterQuery): boolean {
  const hasProject = Array.isArray(filter.projectId)
    ? filter.projectId.length > 0
    : Boolean(filter.projectId);
  const hasUser = Array.isArray(filter.userId) ? filter.userId.length > 0 : Boolean(filter.userId);
  return Boolean(hasProject || hasUser || filter.from || filter.to);
}
