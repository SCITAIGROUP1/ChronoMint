import { ROUTES, type AuthSessionDto, type WorkspaceListItemDto } from "@kloqra/contracts";
import { api } from "../api/client";
import { useWorkspacesStore } from "../stores/workspaces.store";
import { shouldShowAdminContextPicker, filterAdminAccessibleWorkspaces } from "./admin-context";
import { resolveAdminOnboardingPath } from "./resolve-admin-onboarding-path";

/** Resolve where to send an admin user immediately after authentication. */
export async function resolveAdminPostAuthPath(session: AuthSessionDto): Promise<string> {
  if (session.requiresWorkspaceSetup) {
    return resolveAdminOnboardingPath(session);
  }

  try {
    const workspaces = await api<WorkspaceListItemDto[]>(ROUTES.WORKSPACES.LIST, {
      workspaceId: session.workspaceId
    });
    // Seed shared store so shell / switcher / select-context skip duplicate list fetches.
    useWorkspacesStore.getState().setWorkspaces(workspaces);

    if (shouldShowAdminContextPicker(session, workspaces)) {
      return "/select-context";
    }
    const accessible = filterAdminAccessibleWorkspaces(workspaces);
    if (accessible.length > 1) {
      return "/select-workspace";
    }
  } catch {
    // Fall through to role-based landing.
  }

  if (session.tenantRole === "OWNER" || session.tenantRole === "ADMIN") {
    return resolveAdminOnboardingPath(session);
  }

  return "/dashboard";
}
