import {
  getManagedRolePermissions,
  type AuthSessionDto,
  type ManagedRole,
  type Permission
} from "@kloqra/contracts";
import { isCapabilitySnapshotStale } from "../features/tenant/permission-policy-capabilities";

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
 * Prefer the scoped server snapshot when present and fresh; fall back to the flat list,
 * then to role derivation for mixed-deployment clients.
 */
export function getSessionCapabilities(session: AuthSessionDto): Permission[] {
  const snapshot = session.capabilitySnapshot;
  if (snapshot && !isCapabilitySnapshotStale(snapshot)) {
    const permissions: Permission[] = [];
    for (const entry of snapshot.capabilities) {
      if (entry.allowed) permissions.push(entry.permission);
    }
    return [...new Set(permissions)];
  }
  if (session.capabilities) return [...session.capabilities];
  return getManagedRolePermissions(resolveSessionManagedRoles(session));
}

export function sessionCan(session: AuthSessionDto | null | undefined, permission: Permission) {
  return session ? getSessionCapabilities(session).includes(permission) : false;
}
