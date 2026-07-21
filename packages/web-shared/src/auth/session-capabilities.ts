import {
  getManagedRolePermissions,
  type AuthSessionDto,
  type ManagedRole,
  type Permission
} from "@kloqra/contracts";

export function resolveSessionManagedRoles(session: AuthSessionDto): ManagedRole[] {
  const roles: ManagedRole[] = [];

  if (session.tenantRole === "OWNER") roles.push("TENANT_OWNER");
  if (session.tenantRole === "ADMIN") roles.push("TENANT_ADMIN");
  if (session.workspaceRole === "ADMIN") roles.push("WORKSPACE_ADMIN");
  if (session.workspaceRole === "MEMBER") roles.push("WORKSPACE_MEMBER");
  if ((session.managedProjectIds?.length ?? 0) > 0) roles.push("PROJECT_MANAGER");

  return roles;
}

/**
 * Capabilities control presentation only. API policy evaluation remains authoritative.
 * Role derivation is a mixed-deployment fallback until every API session includes a snapshot.
 */
export function getSessionCapabilities(session: AuthSessionDto): Permission[] {
  if (session.capabilities) return [...session.capabilities];
  return getManagedRolePermissions(resolveSessionManagedRoles(session));
}

export function sessionCan(session: AuthSessionDto | null | undefined, permission: Permission) {
  return session ? getSessionCapabilities(session).includes(permission) : false;
}
