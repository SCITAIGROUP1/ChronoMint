import type { AuthSessionDto } from "@kloqra/contracts";
import { describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { resolveAdminOnboardingPath } from "./resolve-admin-onboarding-path";

vi.mock("../api/client", () => ({
  api: vi.fn()
}));

const baseSession = {
  user: { id: "user-1", name: "Owner" },
  tenantId: "tenant-1",
  tenantRole: "OWNER" as const
};

describe("resolveAdminOnboardingPath", () => {
  it("routes pending_setup organization to organization page", async () => {
    vi.mocked(api).mockResolvedValueOnce({ status: "pending_setup" });

    const path = await resolveAdminOnboardingPath({
      ...baseSession,
      requiresWorkspaceSetup: true
    } satisfies AuthSessionDto);

    expect(path).toBe("/account/organization");
  });

  it("routes active organization without workspace to workspace setup", async () => {
    vi.mocked(api).mockResolvedValueOnce({ status: "active" });

    const path = await resolveAdminOnboardingPath({
      ...baseSession,
      requiresWorkspaceSetup: true
    } satisfies AuthSessionDto);

    expect(path).toBe("/account/workspaces?setup=required");
  });
});
