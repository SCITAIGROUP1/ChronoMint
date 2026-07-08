import type { AuthSessionDto, TenantDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import { api } from "../api/client";
import { seedTenantCurrentCache } from "../stores/tenant-current.store";
import { resolveAdminLandingPath } from "./resolve-admin-landing-path";
import { isPendingWorkspaceSetup } from "./tenant-onboarding";

/** Post-auth path for tenant operators still completing organization or workspace setup. */
export async function resolveAdminOnboardingPath(session: AuthSessionDto): Promise<string> {
  if (!isPendingWorkspaceSetup(session)) {
    return resolveAdminLandingPath(session, session.workspaceId ?? "");
  }

  if (session.tenantRole === "OWNER" || session.tenantRole === "ADMIN") {
    try {
      const tenant = await api<TenantDto>(ROUTES.TENANTS.CURRENT);
      seedTenantCurrentCache(tenant);
      if (tenant.status === "pending_setup") {
        return "/account/organization";
      }
    } catch {
      // Fall through to workspace setup.
    }
  }

  return "/account/workspaces?setup=required";
}
