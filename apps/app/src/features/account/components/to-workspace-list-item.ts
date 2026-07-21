import type { WorkspaceListItemDto, WorkspaceWithRoleDto } from "@kloqra/contracts";

/** Maps create/POST workspace payloads onto the slim switcher list DTO. */
export function toWorkspaceListItem(workspace: WorkspaceWithRoleDto): WorkspaceListItemDto {
  return {
    id: workspace.id,
    name: workspace.name,
    role: workspace.role,
    ...(workspace.managedProjectIds ? { managedProjectIds: workspace.managedProjectIds } : {})
  };
}
