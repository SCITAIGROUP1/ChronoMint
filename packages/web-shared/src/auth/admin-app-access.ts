import type { AuthSessionDto } from "@kloqra/contracts";
import { canAccessAccountMode } from "./organization-access";

function hasProjectLeadAccess(ledProjectIds?: string[] | null): boolean {
  return Boolean(ledProjectIds && ledProjectIds.length > 0);
}

/** Workspace operators (admin app workspace mode). */
export function canAccessAdminApp(
  workspaceRole: "ADMIN" | "MEMBER" | undefined,
  ledProjectIds: string[] | undefined
): boolean {
  if (workspaceRole === "ADMIN") return true;
  return hasProjectLeadAccess(ledProjectIds);
}

/** Anyone allowed to authenticate into the admin app (workspace ops or organization mode). */
export function canLoginToAdminApp(
  session: Pick<AuthSessionDto, "workspaceRole" | "tenantRole" | "ledProjectIds"> | null | undefined
): boolean {
  if (!session) return false;
  if (canAccessAdminApp(session.workspaceRole, session.ledProjectIds)) return true;
  return canAccessAccountMode(session);
}
