import { z } from "zod";

/**
 * Canonical policy version. Bump when managed-role policy content changes.
 * Stored in audit events and capability snapshots so stale decisions are detectable.
 */
export const POLICY_VERSION = "v1" as const;
export type PolicyVersion = typeof POLICY_VERSION;

/**
 * Stable authorization actions. IDs are API/domain concepts, never UI routes.
 * Additive changes are non-breaking; renames/removals require a versioned migration.
 */
export const PERMISSIONS = [
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

/**
 * Temporary bridge for legacy PascalCase permission names that appeared in early
 * internal tooling. These are NOT accepted by the evaluator — callers must use
 * canonical IDs. This map exists only to facilitate migration telemetry.
 */
export const LEGACY_PERMISSION_MAP: Readonly<Record<string, Permission>> = {
  AccessConsole: "platform:AccessConsole",
  ListTenants: "platform:ListTenants",
  ManageTenants: "platform:ManageTenants",
  ReadAuditLog: "platform:ReadAuditLog",
  ReadOrganization: "tenant:ReadOrganization",
  UpdateOrganization: "tenant:UpdateOrganization",
  ManageWorkspaceAdmins: "tenant:ManageWorkspaceAdmins",
  ManageMembers: "workspace:ManageMembers",
  CreateProject: "workspace:CreateProject",
  ManageApiKeys: "workspace:ManageApiKeys",
  ReviewTimesheets: "project:ReviewTimesheets",
  ManageTeam: "project:ManageTeam",
  ManageTimer: "personal:ManageTimer"
} as const;

export const permissionSchema = z.enum(PERMISSIONS);
export const resourceScopeSchema = z.enum(["platform", "tenant", "workspace", "project", "self"]);
export const policyEffectSchema = z.enum(["allow", "deny"]);

const policyStatementCoreSchema = z.object({
  effect: policyEffectSchema,
  permission: permissionSchema,
  scope: resourceScopeSchema
});

/**
 * A workspace policy may authorize child project resources. Other permission
 * families must be evaluated at their own scope.
 */
export const policyStatementSchema = policyStatementCoreSchema.superRefine(
  ({ permission, scope }, ctx) => {
    const family = permission.slice(0, permission.indexOf(":"));
    const valid =
      (family === "platform" && scope === "platform") ||
      (family === "tenant" && scope === "tenant") ||
      (family === "workspace" && scope === "workspace") ||
      (family === "project" && (scope === "project" || scope === "workspace")) ||
      (family === "personal" && scope === "self");

    if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${permission} cannot be granted at ${scope} scope`,
        path: ["scope"]
      });
    }
  }
);

export const managedRoleSchema = z.enum([
  "PLATFORM_SUPERADMIN",
  "PLATFORM_SUPPORT",
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "WORKSPACE_ADMIN",
  "WORKSPACE_MEMBER",
  "PROJECT_MANAGER"
]);

export type Permission = z.infer<typeof permissionSchema>;
export type ResourceScope = z.infer<typeof resourceScopeSchema>;
export type PolicyEffect = z.infer<typeof policyEffectSchema>;
export type PolicyStatement = z.infer<typeof policyStatementCoreSchema>;
export type ManagedRole = z.infer<typeof managedRoleSchema>;

/** A single entry in a versioned capability snapshot sent to the UI. */
export interface CapabilityEntry {
  permission: Permission;
  scope: ResourceScope;
  /** Present for project-scoped entries so the UI knows which project the capability covers. */
  resourceId?: string;
}

/**
 * Versioned, short-lived capability snapshot used only for UI composition.
 * Must NOT be used as authorization evidence — every API call reevaluates against
 * the authoritative evaluator.
 */
export interface CapabilitySnapshot {
  policyVersion: PolicyVersion;
  computedAt: string; // ISO-8601
  /** Recommended client-side expiry. Snapshot must be refetched after this time. */
  expiresAt: string; // ISO-8601
  /** ETag for cache validation; changes whenever policy or membership changes. */
  etag: string;
  capabilities: CapabilityEntry[];
}

/** Scope at which each managed role is assigned to a principal. */
export const MANAGED_ROLE_BINDING_SCOPES = {
  PLATFORM_SUPERADMIN: "platform",
  PLATFORM_SUPPORT: "platform",
  TENANT_OWNER: "tenant",
  TENANT_ADMIN: "tenant",
  WORKSPACE_ADMIN: "workspace",
  WORKSPACE_MEMBER: "workspace",
  PROJECT_MANAGER: "project"
} as const satisfies Record<ManagedRole, ResourceScope>;

/**
 * Role-grant delegation matrix.
 * Keys are the granting actor's managed role; values are the roles they are allowed to grant.
 * Rules:
 *  - No role may grant itself (no self-escalation at the same scope).
 *  - No role may grant a role above its own in the hierarchy.
 *  - Platform staff do not manage tenant/workspace assignments — they manage the tenant lifecycle.
 */
export const ROLE_GRANT_MATRIX: Readonly<Record<ManagedRole, readonly ManagedRole[]>> = {
  PLATFORM_SUPERADMIN: ["PLATFORM_SUPPORT"],
  PLATFORM_SUPPORT: [],
  TENANT_OWNER: ["TENANT_ADMIN", "WORKSPACE_ADMIN", "WORKSPACE_MEMBER"],
  TENANT_ADMIN: ["WORKSPACE_ADMIN", "WORKSPACE_MEMBER"],
  WORKSPACE_ADMIN: ["WORKSPACE_MEMBER", "PROJECT_MANAGER"],
  WORKSPACE_MEMBER: [],
  PROJECT_MANAGER: []
} as const;

const allow = (permission: Permission, scope: ResourceScope): PolicyStatement => ({
  effect: "allow",
  permission,
  scope
});

const PERSONAL_POLICY = [
  allow("personal:ManageTimer", "self"),
  allow("personal:ManageTimelogs", "self"),
  allow("personal:SubmitTimesheets", "self"),
  allow("personal:ListProjects", "self"),
  allow("personal:ReadNotifications", "self"),
  allow("personal:ManageProfile", "self"),
  allow("personal:CreateExport", "self")
] as const;

const PROJECT_MANAGER_POLICY = [
  allow("project:Read", "project"),
  allow("project:Update", "project"),
  allow("project:ManageTasks", "project"),
  allow("project:ListTeam", "project"),
  allow("project:ManageTeam", "project"),
  allow("project:ReviewTimesheets", "project"),
  allow("project:ReadReports", "project"),
  allow("project:ReadPresence", "project")
] as const;

const WORKSPACE_PROJECT_POLICY = [
  allow("project:Read", "workspace"),
  allow("project:Update", "workspace"),
  allow("project:ManageTasks", "workspace"),
  allow("project:ListTeam", "workspace"),
  allow("project:ManageTeam", "workspace"),
  allow("project:ReviewTimesheets", "workspace"),
  allow("project:ReadReports", "workspace"),
  allow("project:ReadPresence", "workspace")
] as const;

/**
 * Version 1 managed policies. Tenant roles intentionally do not imply access
 * to workspace operational data; a separate workspace membership is required.
 */
export const MANAGED_ROLE_POLICIES = {
  PLATFORM_SUPERADMIN: [
    allow("platform:AccessConsole", "platform"),
    allow("platform:ListTenants", "platform"),
    allow("platform:ManageTenants", "platform"),
    allow("platform:ReadAuditLog", "platform")
  ],
  PLATFORM_SUPPORT: [
    allow("platform:AccessConsole", "platform"),
    allow("platform:ListTenants", "platform"),
    allow("platform:ReadAuditLog", "platform")
  ],
  TENANT_OWNER: [
    allow("tenant:Access", "tenant"),
    allow("tenant:ReadOrganization", "tenant"),
    allow("tenant:UpdateOrganization", "tenant"),
    allow("tenant:ReadAnalytics", "tenant"),
    allow("tenant:ListWorkspaces", "tenant"),
    allow("tenant:CreateWorkspace", "tenant"),
    allow("tenant:ManageWorkspaceAdmins", "tenant"),
    allow("tenant:ListMembers", "tenant"),
    allow("tenant:ManageMembers", "tenant"),
    allow("tenant:ReadBilling", "tenant"),
    allow("tenant:ManageBilling", "tenant"),
    allow("tenant:ExportData", "tenant")
  ],
  TENANT_ADMIN: [
    allow("tenant:Access", "tenant"),
    allow("tenant:ReadOrganization", "tenant"),
    allow("tenant:UpdateOrganization", "tenant"),
    allow("tenant:ListWorkspaces", "tenant"),
    allow("tenant:CreateWorkspace", "tenant"),
    allow("tenant:ManageWorkspaceAdmins", "tenant")
  ],
  WORKSPACE_ADMIN: [
    allow("workspace:Access", "workspace"),
    allow("workspace:ReadSettings", "workspace"),
    allow("workspace:UpdateSettings", "workspace"),
    allow("workspace:ListMembers", "workspace"),
    allow("workspace:ManageMembers", "workspace"),
    allow("workspace:ListProjects", "workspace"),
    allow("workspace:CreateProject", "workspace"),
    allow("workspace:UpdateProject", "workspace"),
    allow("workspace:DeleteProject", "workspace"),
    allow("workspace:ManageCategories", "workspace"),
    allow("workspace:ReadReports", "workspace"),
    allow("workspace:CreateExport", "workspace"),
    allow("workspace:ManageBillingRates", "workspace"),
    allow("workspace:ManageApiKeys", "workspace"),
    allow("workspace:ReadPresence", "workspace"),
    ...WORKSPACE_PROJECT_POLICY,
    ...PERSONAL_POLICY
  ],
  WORKSPACE_MEMBER: [
    allow("workspace:Access", "workspace"),
    allow("workspace:ListProjects", "workspace"),
    ...PERSONAL_POLICY
  ],
  PROJECT_MANAGER: PROJECT_MANAGER_POLICY
} as const satisfies Record<ManagedRole, readonly PolicyStatement[]>;

export function hasManagedRolePermission(
  role: ManagedRole,
  permission: Permission,
  scope: ResourceScope
): boolean {
  return MANAGED_ROLE_POLICIES[role].some(
    (statement) =>
      statement.effect === "allow" &&
      statement.permission === permission &&
      statement.scope === scope
  );
}

/**
 * Build a presentation-only capability entry list from a set of managed roles.
 * Suitable for populating a {@link CapabilitySnapshot}; must NOT be used as
 * API authorization evidence.
 *
 * Each entry carries the permission and the binding scope from the policy statement.
 * Project-scoped entries will not carry a `resourceId` here — callers must
 * enrich the snapshot with the concrete `projectId` values known at runtime.
 */
export function getManagedRoleCapabilities(roles: readonly ManagedRole[]): CapabilityEntry[] {
  const seen = new Set<string>();
  const entries: CapabilityEntry[] = [];
  for (const role of roles) {
    for (const statement of MANAGED_ROLE_POLICIES[role] as readonly PolicyStatement[]) {
      if (statement.effect !== "allow") continue;
      const key = `${statement.permission}|${statement.scope}`;
      if (!seen.has(key)) {
        seen.add(key);
        entries.push({ permission: statement.permission, scope: statement.scope });
      }
    }
  }
  return entries;
}

/**
 * @deprecated Use {@link getManagedRoleCapabilities} to get scoped entries.
 * Kept for compatibility during the migration window — returns the flat permission set.
 */
export function getManagedRolePermissions(roles: readonly ManagedRole[]): Permission[] {
  const permissions = new Set<Permission>();
  for (const role of roles) {
    for (const statement of MANAGED_ROLE_POLICIES[role] as readonly PolicyStatement[]) {
      if (statement.effect === "allow") permissions.add(statement.permission);
    }
  }
  return [...permissions];
}
