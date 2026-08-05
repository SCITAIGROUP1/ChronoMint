import { ROUTES } from "@kloqra/contracts";
import type { WorkspaceListItemDto } from "@kloqra/contracts";
import { api } from "../api/client";
import { useWorkspacesStore } from "../stores/workspaces.store";
import { filterAdminAccessibleWorkspaces } from "./admin-context";

export type WorkspaceCheckOptions = {
  roleFilter?: "ADMIN";
  /** Include workspace administrators and project managers. */
  filterAdminAccess?: boolean;
};

/**
 * Checks if the user belongs to multiple workspaces (optionally filtering by role).
 * Seeds `useWorkspacesStore` so shell/switcher do not refetch the same list.
 */
export async function hasMultipleWorkspaces(
  activeWorkspaceId: string,
  options?: WorkspaceCheckOptions | "ADMIN"
): Promise<boolean> {
  const normalized = typeof options === "string" ? { roleFilter: options } : options;
  try {
    const list = await api<WorkspaceListItemDto[]>(ROUTES.WORKSPACES.LIST, {
      workspaceId: activeWorkspaceId
    });
    if (list.length > 0) {
      useWorkspacesStore.getState().setWorkspaces(list);
    }
    const filtered = normalized?.filterAdminAccess
      ? filterAdminAccessibleWorkspaces(list)
      : normalized?.roleFilter
        ? list.filter((w) => w.role === normalized.roleFilter)
        : list;
    return filtered.length > 1;
  } catch {
    return false;
  }
}
