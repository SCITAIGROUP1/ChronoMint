import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  LEGACY_PERMISSION_MAP,
  MANAGED_ROLE_BINDING_SCOPES,
  MANAGED_ROLE_POLICIES,
  MANAGED_ROLE_POLICY_METADATA,
  PERMISSION_METADATA,
  PERMISSIONS,
  POLICY_CHECKSUM,
  POLICY_SNAPSHOT,
  POLICY_VERSION,
  ROLE_GRANT_MATRIX,
  capabilitySnapshotSchema,
  getManagedRoleCapabilities,
  hasManagedRolePermission,
  managedRoleSchema,
  permissionSchema,
  policyStatementSchema
} from "./permissions";

const V1_PERMISSIONS = [
  "platform:AccessConsole",
  "platform:ListTenants",
  "platform:ManageTenants",
  "platform:ReadAuditLog",
  "tenant:Access",
  "tenant:ReadOrganization",
  "tenant:UpdateOrganization",
  "tenant:ReadAnalytics",
  "tenant:ListWorkspaces",
  "tenant:CreateWorkspace",
  "tenant:ManageWorkspaceAdmins",
  "tenant:ListMembers",
  "tenant:ManageMembers",
  "tenant:ReadBilling",
  "tenant:ManageBilling",
  "tenant:ExportData",
  "workspace:Access",
  "workspace:ReadSettings",
  "workspace:UpdateSettings",
  "workspace:ListMembers",
  "workspace:ManageMembers",
  "workspace:ListProjects",
  "workspace:CreateProject",
  "workspace:UpdateProject",
  "workspace:DeleteProject",
  "workspace:ManageCategories",
  "workspace:ReadReports",
  "workspace:CreateExport",
  "workspace:ManageBillingRates",
  "workspace:ManageApiKeys",
  "workspace:ReadPresence",
  "project:Read",
  "project:Update",
  "project:ManageTasks",
  "project:ListTeam",
  "project:ManageTeam",
  "project:ReviewTimesheets",
  "project:ReadReports",
  "project:ReadPresence",
  "personal:ManageTimer",
  "personal:ManageTimelogs",
  "personal:SubmitTimesheets",
  "personal:ListProjects",
  "personal:ReadNotifications",
  "personal:ManageProfile",
  "personal:CreateExport"
] as const;

const EXPECTED_DEFAULT_COUNTS = {
  PLATFORM_SUPERADMIN: 23,
  PLATFORM_SUPPORT: 12,
  TENANT_OWNER: 18,
  TENANT_ADMIN: 7,
  WORKSPACE_ADMIN: 44,
  WORKSPACE_MEMBER: 14,
  PROJECT_MANAGER: 8
} as const;

describe("permission contracts v2", () => {
  it("publishes the exact versioned policy snapshot and checksum", () => {
    expect(POLICY_VERSION).toBe("v2");
    expect(POLICY_SNAPSHOT.version).toBe("v2");
    const digest = createHash("sha256").update(JSON.stringify(POLICY_SNAPSHOT)).digest("hex");
    expect(POLICY_CHECKSUM).toBe(`sha256:${digest}`);
    expect(POLICY_CHECKSUM).toBe(
      "sha256:4ff207ecc9dd196d6a5bdf8e412990540528d2cc5577dc60aac4b0b54b312530"
    );
  });

  it("retains every v1 ID and has the exact v2 catalog size", () => {
    expect(PERMISSIONS).toHaveLength(84);
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    expect(PERMISSIONS).toEqual(expect.arrayContaining([...V1_PERMISSIONS]));
    expect(PERMISSIONS).not.toContain("platform:ImpersonateTenantUser");
    expect(PERMISSIONS).not.toContain("personal:ReadReports");
  });

  it("has complete explicit metadata and no orphan IDs", () => {
    expect(Object.keys(PERMISSION_METADATA).sort()).toEqual([...PERMISSIONS].sort());
    for (const permission of PERMISSIONS) {
      const meta = PERMISSION_METADATA[permission];
      expect(meta.id).toBe(permission);
      expect(meta.label).not.toBe("");
      expect(meta.description).not.toBe("");
      expect(meta.resourceScope).toBeTruthy();
      expect(meta.resourceFamily).toBeTruthy();
      expect(meta.parentGroup).not.toBe("");
      expect(meta.actionDimension).toBeTruthy();
      expect(meta.riskLevel).toBeTruthy();
      expect(typeof meta.customizable).toBe("boolean");
      expect(meta.applicableTargetRoles.length).toBeGreaterThan(0);
      expect(meta.lifecycle).toBeTruthy();
      expect(meta.enforcementStatus).toBeTruthy();
      expect(permissionSchema.parse(permission)).toBe(permission);
    }
  });

  it("keeps platform and tenant-owner templates immutable", () => {
    expect(MANAGED_ROLE_POLICY_METADATA.PLATFORM_SUPERADMIN).toEqual({
      immutable: true,
      customizationEnabled: false
    });
    expect(MANAGED_ROLE_POLICY_METADATA.PLATFORM_SUPPORT).toEqual({
      immutable: true,
      customizationEnabled: false
    });
    expect(MANAGED_ROLE_POLICY_METADATA.TENANT_OWNER).toEqual({
      immutable: true,
      customizationEnabled: false
    });
    for (const permission of PERMISSIONS.filter((id) => id.startsWith("platform:"))) {
      expect(PERMISSION_METADATA[permission].customizable).toBe(false);
    }
  });

  it("has exact conservative managed-role defaults with no duplicates", () => {
    for (const role of managedRoleSchema.options) {
      const statements = MANAGED_ROLE_POLICIES[role];
      expect(statements).toHaveLength(EXPECTED_DEFAULT_COUNTS[role]);
      const keys = statements.map(({ permission, scope }) => `${permission}|${scope}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("limits platform support to read, support, and self operations", () => {
    const supportPermissions = MANAGED_ROLE_POLICIES.PLATFORM_SUPPORT.map(
      ({ permission }) => permission
    );
    expect(supportPermissions).toEqual([
      "platform:AccessConsole",
      "platform:ListTenants",
      "platform:ReadAuditLog",
      "platform:ReadOperations",
      "platform:ReadSubscriptions",
      "platform:ReadPlanCatalog",
      "platform:ReadSupportTickets",
      "platform:ManageSupportTickets",
      "platform:ReadSupportMetrics",
      "platform:ReadOwnNotifications",
      "platform:ManageOwnProfile",
      "platform:ManageOwnSecurity"
    ]);
    expect(supportPermissions).not.toContain("platform:ManageTenants");
    expect(supportPermissions).not.toContain("platform:ManageQueues");
    expect(supportPermissions).not.toContain("platform:ManageStaff");
  });

  it("does not silently grant tenant admin policy, member, billing, or data powers", () => {
    const tenantAdminPermissions = MANAGED_ROLE_POLICIES.TENANT_ADMIN.map(
      ({ permission }) => permission
    );
    expect(tenantAdminPermissions).toEqual([
      "tenant:Access",
      "tenant:ReadOrganization",
      "tenant:UpdateOrganization",
      "tenant:ListWorkspaces",
      "tenant:CreateWorkspace",
      "tenant:ManageWorkspaceAdmins",
      "personal:ManageAccountSecurity"
    ]);
  });

  it("validates scope and target-role applicability for every default", () => {
    for (const role of managedRoleSchema.options) {
      for (const statement of MANAGED_ROLE_POLICIES[role]) {
        expect(policyStatementSchema.parse(statement)).toEqual(statement);
        expect(PERMISSION_METADATA[statement.permission].applicableTargetRoles).toContain(role);
      }
    }
    expect(
      policyStatementSchema.safeParse({
        effect: "allow",
        permission: "project:ManageTasks",
        scope: "tenant"
      }).success
    ).toBe(false);
  });

  it("has no policy references outside the canonical catalog", () => {
    for (const statements of Object.values(MANAGED_ROLE_POLICIES)) {
      for (const statement of statements) {
        expect(PERMISSIONS).toContain(statement.permission);
      }
    }
    for (const canonical of Object.values(LEGACY_PERMISSION_MAP)) {
      expect(PERMISSIONS).toContain(canonical);
    }
  });

  it("covers binding scopes and enforces safe delegation boundaries", () => {
    expect(Object.keys(MANAGED_ROLE_BINDING_SCOPES).sort()).toEqual(
      [...managedRoleSchema.options].sort()
    );
    expect(Object.keys(ROLE_GRANT_MATRIX).sort()).toEqual([...managedRoleSchema.options].sort());
    for (const [grantor, grantable] of Object.entries(ROLE_GRANT_MATRIX)) {
      expect(grantable).not.toContain(grantor);
      expect(grantable).not.toContain("TENANT_OWNER");
      expect(grantable).not.toContain("PLATFORM_SUPERADMIN");
    }
    expect(ROLE_GRANT_MATRIX.PLATFORM_SUPPORT).toEqual([]);
    expect(ROLE_GRANT_MATRIX.TENANT_ADMIN).toEqual(["WORKSPACE_ADMIN", "WORKSPACE_MEMBER"]);
    expect(ROLE_GRANT_MATRIX.WORKSPACE_MEMBER).toEqual([]);
    expect(ROLE_GRANT_MATRIX.PROJECT_MANAGER).toEqual([]);
  });

  it("keeps tenant roles out of workspace and project operational policy", () => {
    for (const role of ["TENANT_OWNER", "TENANT_ADMIN"] as const) {
      expect(
        MANAGED_ROLE_POLICIES[role].some(
          ({ permission }) =>
            permission.startsWith("workspace:") || permission.startsWith("project:")
        )
      ).toBe(false);
    }
  });

  it("builds complete scoped capability snapshots for auth migration", () => {
    const capabilityTemplates = getManagedRoleCapabilities(["WORKSPACE_ADMIN"]);
    const capabilities = capabilityTemplates.map((entry) => ({
      ...entry,
      resourceId: entry.scope === "self" ? "user-1" : "workspace-1",
      allowed: true,
      source: "canonical-role" as const,
      sourceRole: "WORKSPACE_ADMIN" as const
    }));
    const parsed = capabilitySnapshotSchema.parse({
      policyVersion: POLICY_VERSION,
      policyChecksum: POLICY_CHECKSUM,
      policyRevision: 9,
      membershipRevision: 4,
      principalId: "user-1",
      tenantId: "tenant-1",
      computedAt: "2026-07-22T00:00:00.000Z",
      expiresAt: "2026-07-22T00:05:00.000Z",
      etag: '"policy-9-membership-4"',
      capabilities
    });
    expect(parsed.capabilities.every(({ resourceId }) => resourceId.length > 0)).toBe(true);
    expect(hasManagedRolePermission("PROJECT_MANAGER", "project:ManageTasks", "project")).toBe(
      true
    );
  });
});
