import { describe, expect, it } from "vitest";
import { PLAN_SLUGS } from "../plan-catalog";
import {
  authScopeSchema,
  authSessionSchema,
  productAuthScopeSchema,
  signupSchema
} from "./auth.dto";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const TENANT_ID = "00000000-0000-4000-8000-000000000010";
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000020";

describe("auth scope schemas", () => {
  it("accepts only the unified app and isolated platform scopes", () => {
    expect(authScopeSchema.safeParse("app").success).toBe(true);
    expect(authScopeSchema.safeParse("platform").success).toBe(true);
    expect(authScopeSchema.safeParse("client").success).toBe(false);
    expect(authScopeSchema.safeParse("admin").success).toBe(false);
  });

  it("limits product tokens to app scope", () => {
    expect(productAuthScopeSchema.safeParse("app").success).toBe(true);
    expect(productAuthScopeSchema.safeParse("platform").success).toBe(false);
    expect(productAuthScopeSchema.safeParse("client").success).toBe(false);
    expect(productAuthScopeSchema.safeParse("admin").success).toBe(false);
  });
});

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

  it("validates an optional presentation-only capability snapshot", () => {
    const base = {
      user: { id: USER_ID, name: "Admin User" },
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      workspaceName: "Primary",
      workspaceRole: "ADMIN"
    };

    expect(
      authSessionSchema.safeParse({
        ...base,
        capabilities: ["workspace:ManageMembers", "personal:ManageTimer"]
      }).success
    ).toBe(true);
    expect(
      authSessionSchema.safeParse({
        ...base,
        capabilities: ["workspace:BecomeOwner"]
      }).success
    ).toBe(false);
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
