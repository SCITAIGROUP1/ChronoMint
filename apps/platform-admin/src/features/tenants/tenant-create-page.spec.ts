import { createPlatformTenantSchema } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";

describe("createPlatformTenantSchema (platform-admin)", () => {
  it("requires organization name, owner email, and plan", () => {
    expect(createPlatformTenantSchema.safeParse({}).success).toBe(false);
    expect(
      createPlatformTenantSchema.safeParse({
        organizationName: "Acme",
        ownerEmail: "owner@acme.com",
        planId: "00000000-0000-4000-8000-000000000001"
      }).success
    ).toBe(true);
  });
});
