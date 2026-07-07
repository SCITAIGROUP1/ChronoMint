import { ROUTES, type AuthSessionDto, type WorkspaceListItemDto } from "@kloqra/contracts";
import { api } from "../api/client";
import { shouldShowAdminContextPicker } from "./admin-context";
import { resolveAdminOnboardingPath } from "./resolve-admin-onboarding-path";
import { hasMultipleWorkspaces } from "./workspace-check";

/** Resolve where to send an admin user immediately after authentication. */
export async function resolveAdminPostAuthPath(session: AuthSessionDto): Promise<string> {
  if (session.requiresWorkspaceSetup) {
    return resolveAdminOnboardingPath(session);
  }

  try {
    const workspaces = await api<WorkspaceListItemDto[]>(ROUTES.WORKSPACES.LIST, {
      workspaceId: session.workspaceId
    });
    if (shouldShowAdminContextPicker(session, workspaces)) {
      return "/select-context";
    }
    const multi = await hasMultipleWorkspaces(session.workspaceId!, {
      filterAdminAccess: true
    });
    if (multi) {
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
