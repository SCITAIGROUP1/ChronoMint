import type { AuthSessionDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import { api } from "../api/client";
import { resolveAdminLandingPath } from "./resolve-admin-landing-path";
import { isPendingWorkspaceSetup } from "./tenant-onboarding";

/** Post-auth path for tenant operators still completing organization or workspace setup. */
export async function resolveAdminOnboardingPath(session: AuthSessionDto): Promise<string> {
  if (!isPendingWorkspaceSetup(session)) {
    return resolveAdminLandingPath(session, session.workspaceId ?? "");
  }

  if (session.tenantRole === "OWNER" || session.tenantRole === "ADMIN") {
    try {
      const tenant = await api<{ status: string }>(ROUTES.TENANTS.CURRENT);
      if (tenant.status === "pending_setup") {
        return "/account/organization";
      }
    } catch {
      // Fall through to workspace setup.
    }
  }

  return "/account/workspaces?setup=required";
}
