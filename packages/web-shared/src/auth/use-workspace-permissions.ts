import { useMemo } from "react";
import { useAdminContext } from "./admin-context";

export function useWorkspacePermissions() {
  const { user } = useAdminContext();

  return useMemo(() => {
    const role = user.role;
    const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";
    const managedProjectIds = user.managedProjectIds || [];

    return {
      canManageBilling: () => isOwnerOrAdmin,
      canInviteMembers: () => isOwnerOrAdmin,
      canManageWorkspaceSettings: () => isOwnerOrAdmin,
      canManageProject: (projectId: string) => {
        if (isOwnerOrAdmin) return true;
        return managedProjectIds.includes(projectId);
      },
      canManageAnyProject: () => {
        if (isOwnerOrAdmin) return true;
        return managedProjectIds.length > 0;
      },
      isProjectManager: (projectId: string) => managedProjectIds.includes(projectId),
      isGlobalAdmin: () => isOwnerOrAdmin,
      managedProjectIds,
      role
    };
  }, [user.role, user.managedProjectIds]);
}
