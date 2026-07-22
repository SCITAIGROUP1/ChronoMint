import type { AuthSessionDto } from "@kloqra/contracts";
import { canManageOrganization } from "./organization-access";

/** Tenant owner/admin authenticated before their first workspace exists. */
export function isPendingWorkspaceSetup(
  session: Pick<AuthSessionDto, "requiresWorkspaceSetup"> | null | undefined
): boolean {
  return session?.requiresWorkspaceSetup === true;
}

const ONBOARDING_ACCOUNT_PATH_PREFIXES = [
  "/account/organization",
  "/account/workspaces",
  "/account/profile",
  "/account/settings",
  "/account/notifications"
] as const;

export function isAllowedDuringWorkspaceSetup(pathname: string): boolean {
  return ONBOARDING_ACCOUNT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * When workspace setup is pending, restrict navigation to organization onboarding routes.
 * Returns a redirect path or null when the current path is allowed.
 */
export function resolveWorkspaceSetupRedirect(
  pathname: string,
  session: AuthSessionDto | null | undefined
): string | null {
  if (!session) return null;
  if (session.organizationOnly) {
    return pathname === "/account" || pathname.startsWith("/account/")
      ? null
      : "/account/workspaces";
  }
  if (!isPendingWorkspaceSetup(session)) return null;
  if (!canManageOrganization(session)) return "/login";
  if (isAllowedDuringWorkspaceSetup(pathname)) return null;
  return "/account/workspaces?setup=required";
}
