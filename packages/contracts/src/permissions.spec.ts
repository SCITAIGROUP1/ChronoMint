import { describe, expect, it } from "vitest";
import {
  LEGACY_PERMISSION_MAP,
  MANAGED_ROLE_BINDING_SCOPES,
  MANAGED_ROLE_POLICIES,
  PERMISSIONS,
  POLICY_VERSION,
  ROLE_GRANT_MATRIX,
  getManagedRoleCapabilities,
  getManagedRolePermissions,
  hasManagedRolePermission,
  managedRoleSchema,
  permissionSchema,
  policyStatementSchema
} from "./permissions";

describe("permission contracts", () => {
  it("keeps permission identifiers unique and AWS-style", () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    for (const permission of PERMISSIONS) {
      expect(permission).toMatch(/^[a-z]+:[A-Z][A-Za-z]+$/);
      expect(permissionSchema.parse(permission)).toBe(permission);
    }
  });

  it("defines a valid policy for every managed role", () => {
    for (const role of managedRoleSchema.options) {
      const statements = MANAGED_ROLE_POLICIES[role];
      expect(statements.length).toBeGreaterThan(0);
      for (const statement of statements) {
        expect(policyStatementSchema.parse(statement)).toEqual(statement);
        expect(statement.effect).toBe("allow");
      }
    }
  });

  it("defines one binding scope for every managed role", () => {
    expect(Object.keys(MANAGED_ROLE_BINDING_SCOPES).sort()).toEqual(
      [...managedRoleSchema.options].sort()
    );
    expect(MANAGED_ROLE_BINDING_SCOPES.TENANT_OWNER).toBe("tenant");
    expect(MANAGED_ROLE_BINDING_SCOPES.WORKSPACE_ADMIN).toBe("workspace");
    expect(MANAGED_ROLE_BINDING_SCOPES.PROJECT_MANAGER).toBe("project");
  });

  it("keeps tenant roles out of workspace operational data", () => {
    for (const role of ["TENANT_OWNER", "TENANT_ADMIN"] as const) {
      expect(
        MANAGED_ROLE_POLICIES[role].some(
          ({ permission }) =>
            permission.startsWith("workspace:") ||
            permission.startsWith("project:") ||
            permission.startsWith("personal:")
        )
      ).toBe(false);
    }
  });

  it("limits project managers to their project scope", () => {
    const statements = MANAGED_ROLE_POLICIES.PROJECT_MANAGER;
    expect(statements.every(({ scope }) => scope === "project")).toBe(true);
    expect(hasManagedRolePermission("PROJECT_MANAGER", "project:ManageTasks", "project")).toBe(
      true
    );
    expect(
      hasManagedRolePermission("PROJECT_MANAGER", "workspace:ManageMembers", "workspace")
    ).toBe(false);
  });

  it("does not grant tenant admins owner billing or export permissions", () => {
    expect(hasManagedRolePermission("TENANT_OWNER", "tenant:ManageBilling", "tenant")).toBe(true);
    expect(hasManagedRolePermission("TENANT_OWNER", "tenant:ExportData", "tenant")).toBe(true);
    expect(hasManagedRolePermission("TENANT_ADMIN", "tenant:ManageBilling", "tenant")).toBe(false);
    expect(hasManagedRolePermission("TENANT_ADMIN", "tenant:ExportData", "tenant")).toBe(false);
  });

  it("builds a deduplicated capability snapshot from combined roles", () => {
    const capabilities = getManagedRolePermissions([
      "TENANT_OWNER",
      "WORKSPACE_ADMIN",
      "PROJECT_MANAGER"
    ]);

    expect(capabilities).toContain("tenant:ManageBilling");
    expect(capabilities).toContain("workspace:ManageMembers");
    expect(capabilities).toContain("project:ManageTasks");
    expect(new Set(capabilities).size).toBe(capabilities.length);
  });

  it("rejects unknown permissions and invalid policy statements", () => {
    expect(permissionSchema.safeParse("workspace:BecomeOwner").success).toBe(false);
    expect(
      policyStatementSchema.safeParse({
        effect: "allow",
        permission: "project:ManageTasks",
        scope: "tenant"
      }).success
    ).toBe(false);
  });

  it("exports a stable non-empty policy version string", () => {
    expect(typeof POLICY_VERSION).toBe("string");
    expect(POLICY_VERSION.length).toBeGreaterThan(0);
    // Version must not change accidentally — update this assertion intentionally when bumping
    expect(POLICY_VERSION).toBe("v1");
  });

  it("LEGACY_PERMISSION_MAP values are valid canonical permissions", () => {
    for (const [legacy, canonical] of Object.entries(LEGACY_PERMISSION_MAP)) {
      expect(typeof legacy).toBe("string");
      expect(permissionSchema.safeParse(canonical).success).toBe(true);
    }
  });

  it("ROLE_GRANT_MATRIX covers every managed role and prohibits self-escalation", () => {
    const roles = managedRoleSchema.options;
    // Every role appears as a key
    expect(Object.keys(ROLE_GRANT_MATRIX).sort()).toEqual([...roles].sort());
    // No role may grant itself (same-level escalation)
    for (const [grantor, grantable] of Object.entries(ROLE_GRANT_MATRIX)) {
      expect(grantable).not.toContain(grantor);
    }
    // Nobody can grant a TENANT_OWNER — that is only set by platform operations
    for (const grantable of Object.values(ROLE_GRANT_MATRIX)) {
      expect(grantable).not.toContain("TENANT_OWNER");
    }
    // WORKSPACE_MEMBER and PROJECT_MANAGER cannot grant anything
    expect(ROLE_GRANT_MATRIX.WORKSPACE_MEMBER).toHaveLength(0);
    expect(ROLE_GRANT_MATRIX.PROJECT_MANAGER).toHaveLength(0);
  });

  it("getManagedRoleCapabilities returns scoped entries without duplicates", () => {
    const entries = getManagedRoleCapabilities(["WORKSPACE_ADMIN", "PROJECT_MANAGER"]);
    expect(entries.length).toBeGreaterThan(0);
    // Each entry has a permission and a scope
    for (const entry of entries) {
      expect(permissionSchema.safeParse(entry.permission).success).toBe(true);
      expect(typeof entry.scope).toBe("string");
    }
    // No duplicate permission+scope combinations
    const keys = entries.map((e) => `${e.permission}|${e.scope}`);
    expect(new Set(keys).size).toBe(keys.length);
    // Project manager entries carry project scope
    const pmEntries = entries.filter((e) => e.permission.startsWith("project:"));
    expect(pmEntries.every((e) => e.scope === "project" || e.scope === "workspace")).toBe(true);
  });
});
