/** Whether /select-workspace should list all memberships (member) vs admin/PM access. */
export function isMemberPortalSession(
  session: {
    workspaceRole?: string | null;
    tenantRole?: string | null;
    managedProjectIds?: string[] | null;
  } | null
): boolean {
  if (!session) return true;
  if (session.tenantRole === "OWNER" || session.tenantRole === "ADMIN") return false;
  if (session.workspaceRole === "ADMIN") return false;
  return !(session.managedProjectIds && session.managedProjectIds.length > 0);
}
