import { describe, expect, it } from "vitest";
import { PLAN_SLUGS } from "../plan-catalog";
import { authSessionSchema, signupSchema } from "./auth.dto";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const TENANT_ID = "00000000-0000-4000-8000-000000000010";
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000020";

describe("authSessionSchema", () => {
  it("accepts workspace session", () => {
    const result = authSessionSchema.safeParse({
      user: { id: USER_ID, name: "Admin User" },
      tenantId: TENANT_ID,
      tenantRole: "OWNER",
      workspaceId: WORKSPACE_ID,
      workspaceName: "Primary",
      workspaceRole: "ADMIN"
    });
    expect(result.success).toBe(true);
  });

  it("accepts tenant-operator session without workspace", () => {
    const result = authSessionSchema.safeParse({
      user: { id: USER_ID, name: "Owner User" },
      tenantId: TENANT_ID,
      tenantRole: "OWNER",
      requiresWorkspaceSetup: true
    });
    expect(result.success).toBe(true);
  });

  it("rejects session without workspace or setup flag", () => {
    const result = authSessionSchema.safeParse({
      user: { id: USER_ID, name: "Owner User" },
      tenantId: TENANT_ID,
      tenantRole: "OWNER"
    });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("accepts valid self-serve signup payload", () => {
    const result = signupSchema.safeParse({
      email: "owner@acme.com",
      password: "Password123!",
      name: "Jane Owner",
      organizationName: "Acme Corporation",
      planSlug: PLAN_SLUGS.STARTER
    });
    expect(result.success).toBe(true);
  });

  it("rejects pilot plan slug", () => {
    const result = signupSchema.safeParse({
      email: "owner@acme.com",
      password: "Password123!",
      name: "Jane Owner",
      organizationName: "Acme Corporation",
      planSlug: PLAN_SLUGS.PILOT
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak password", () => {
    const result = signupSchema.safeParse({
      email: "owner@acme.com",
      password: "short",
      name: "Jane Owner",
      organizationName: "Acme Corporation",
      planSlug: PLAN_SLUGS.PRO
    });
    expect(result.success).toBe(false);
  });
});
