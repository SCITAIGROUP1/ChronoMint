import { describe, expect, it } from "vitest";
import {
  isAllowedDuringWorkspaceSetup,
  isPendingWorkspaceSetup,
  resolveWorkspaceSetupRedirect
} from "./tenant-onboarding";

describe("tenant onboarding", () => {
  const onboardingSession = {
    user: { id: "u1", name: "Owner" },
    tenantId: "t1",
    tenantRole: "OWNER" as const,
    requiresWorkspaceSetup: true as const
  };

  it("detects pending workspace setup", () => {
    expect(isPendingWorkspaceSetup(onboardingSession)).toBe(true);
    expect(isPendingWorkspaceSetup({ requiresWorkspaceSetup: undefined })).toBe(false);
  });

  it("allows organization onboarding paths", () => {
    expect(isAllowedDuringWorkspaceSetup("/account/organization")).toBe(true);
    expect(isAllowedDuringWorkspaceSetup("/account/workspaces")).toBe(true);
    expect(isAllowedDuringWorkspaceSetup("/account/profile")).toBe(true);
  });

  it("redirects workspace routes during setup", () => {
    expect(resolveWorkspaceSetupRedirect("/dashboard", onboardingSession)).toBe(
      "/account/workspaces?setup=required"
    );
    expect(resolveWorkspaceSetupRedirect("/account/billing", onboardingSession)).toBe(
      "/account/workspaces?setup=required"
    );
    expect(resolveWorkspaceSetupRedirect("/account/organization", onboardingSession)).toBeNull();
  });

  it("keeps organization-only admins in account mode without requiring creation", () => {
    const organizationAdmin = {
      user: { id: "u2", name: "Second Admin" },
      tenantId: "t1",
      tenantRole: "ADMIN" as const,
      organizationOnly: true as const
    };
    expect(resolveWorkspaceSetupRedirect("/dashboard", organizationAdmin)).toBe(
      "/account/workspaces"
    );
    expect(resolveWorkspaceSetupRedirect("/account/workspaces", organizationAdmin)).toBeNull();
  });
});
