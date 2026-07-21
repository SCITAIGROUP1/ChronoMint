import type { AppNavItem } from "./app-nav";
import { APP_NAV_ITEMS } from "./app-nav";

const LEAD_ALLOWED_HREFS = new Set([
  "/dashboard",
  "/projects",
  "/approvals",
  "/time-tracker",
  "/team",
  "/notifications"
]);

/** Nav items visible to workspace MEMBERs who lead at least one project. */
export function projectLeadNavItems(): readonly AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => LEAD_ALLOWED_HREFS.has(item.href));
}

export { canAccessAdminApp as canAccessApp } from "@kloqra/web-shared";

export function isProjectLeadOnly(
  workspaceRole: "ADMIN" | "MEMBER" | undefined,
  ledProjectIds: string[] | undefined,
  tenantRole?: string | null
): boolean {
  if (tenantRole === "OWNER" || tenantRole === "ADMIN") return false;
  return workspaceRole === "MEMBER" && Boolean(ledProjectIds && ledProjectIds.length > 0);
}
