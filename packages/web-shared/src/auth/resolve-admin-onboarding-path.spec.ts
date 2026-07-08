import type { AuthSessionDto } from "@kloqra/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { tenantCurrentCacheKey, useTenantCurrentStore } from "../stores/tenant-current.store";
import { resolveAdminOnboardingPath } from "./resolve-admin-onboarding-path";

vi.mock("../api/client", () => ({
  api: vi.fn()
}));

const baseSession = {
  user: { id: "user-1", name: "Owner" },
  tenantId: "tenant-1",
  tenantRole: "OWNER" as const
};

const pendingTenant = {
  id: "tenant-1",
  name: "Acme",
  slug: "acme",
  status: "pending_setup" as const,
  settings: {},
  createdAt: new Date().toISOString()
};

describe("resolveAdminOnboardingPath", () => {
  beforeEach(() => {
    useTenantCurrentStore.getState().clear();
  });

  it("routes pending_setup organization to organization page", async () => {
    vi.mocked(api).mockResolvedValueOnce(pendingTenant);

    const path = await resolveAdminOnboardingPath({
      ...baseSession,
      requiresWorkspaceSetup: true
    } satisfies AuthSessionDto);

    expect(path).toBe("/account/organization");
    expect(useTenantCurrentStore.getState().byKey[tenantCurrentCacheKey(null)]?.tenant).toEqual(
      pendingTenant
    );
  });

  it("routes active organization without workspace to workspace setup", async () => {
    vi.mocked(api).mockResolvedValueOnce({
      ...pendingTenant,
      status: "active"
    });

    const path = await resolveAdminOnboardingPath({
      ...baseSession,
      requiresWorkspaceSetup: true
    } satisfies AuthSessionDto);

    expect(path).toBe("/account/workspaces?setup=required");
  });
});
