import type { AuthSessionDto } from "@kloqra/contracts";
import { canAccessAccountMode } from "./organization-access";

function hasProjectLeadAccess(managedProjectIds?: string[] | null): boolean {
  return Boolean(managedProjectIds && managedProjectIds.length > 0);
}

/** Workspace operators who may enter management mode. */
export function canAccessAdminApp(
  workspaceRole: "ADMIN" | "MEMBER" | undefined,
  managedProjectIds?: string[] | null
): boolean {
  if (workspaceRole === "ADMIN") return true;
  return hasProjectLeadAccess(managedProjectIds);
}

/** Anyone allowed to use management or organization mode. */
export function canLoginToAdminApp(
  session:
    | Partial<
        Pick<
          AuthSessionDto,
          "workspaceRole" | "tenantRole" | "managedProjectIds" | "requiresWorkspaceSetup"
        >
      >
    | null
    | undefined
): boolean {
  if (!session) return false;
  if (session.requiresWorkspaceSetup && canAccessAccountMode(session)) return true;
  if (canAccessAdminApp(session.workspaceRole, session.managedProjectIds)) return true;
  return canAccessAccountMode(session);
}
