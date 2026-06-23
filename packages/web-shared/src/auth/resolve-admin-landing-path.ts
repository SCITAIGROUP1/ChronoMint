import type { AuthSessionDto, TenantDto } from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import { api } from "../api/client";

export async function resolveAdminLandingPath(
  session: AuthSessionDto,
  workspaceId: string
): Promise<string> {
  if (session.tenantRole === "OWNER") {
    try {
      const tenant = await api<TenantDto>(ROUTES.TENANTS.CURRENT, { workspaceId });
      if (tenant.status === "pending_setup") {
        return "/account/organization";
      }
    } catch {
      // Fall through to default owner landing.
    }
    return "/account";
  }
  return "/dashboard";
}
