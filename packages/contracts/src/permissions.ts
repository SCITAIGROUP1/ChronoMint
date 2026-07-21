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

export type PermissionCategory =
  | "organization"
  | "billing"
  | "workspaces"
  | "projects"
  | "timelogs";
export type PermissionActionType =
  | "VIEW"
  | "CREATE"
  | "EDIT"
  | "DELETE"
  | "EXPORT"
  | "read"
  | "write"
  | "delete"
  | "export";
export type PermissionRiskLevel = "low" | "medium" | "high";

export interface PermissionMeta {
  id: Permission;
  label: string;
  category: PermissionCategory;
  parentGroup?: string;
  actionDimension?: "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT";
  actionType: PermissionActionType;
  riskLevel: PermissionRiskLevel;
  description: string;
}

export const PERMISSION_METADATA: Readonly<Record<Permission, PermissionMeta>> = {
  "platform:AccessConsole": {
    id: "platform:AccessConsole",
    label: "Access Platform Console",
    category: "organization",
    actionType: "read",
    riskLevel: "high",
    description: "Access internal platform console"
  },
  "platform:ListTenants": {
    id: "platform:ListTenants",
    label: "List All Tenants",
    category: "organization",
    actionType: "read",
    riskLevel: "medium",
    description: "List all tenants across the platform"
  },
  "platform:ManageTenants": {
    id: "platform:ManageTenants",
    label: "Manage Tenants",
    category: "organization",
    actionType: "write",
    riskLevel: "high",
    description: "Create, suspend, or manage platform tenants"
  },
  "platform:ReadAuditLog": {
    id: "platform:ReadAuditLog",
    label: "Read Platform Audit Log",
    category: "organization",
    actionType: "read",
    riskLevel: "medium",
    description: "View platform operations audit trail"
  },
  "tenant:Access": {
    id: "tenant:Access",
    label: "Access Organization",
    category: "organization",
    actionType: "read",
    riskLevel: "low",
    description: "Sign in and view organization workspace shell"
  },
  "tenant:ReadOrganization": {
    id: "tenant:ReadOrganization",
    label: "View Organization Details",
    category: "organization",
    actionType: "read",
    riskLevel: "low",
    description: "View tenant profile and general organization overview"
  },
  "tenant:UpdateOrganization": {
    id: "tenant:UpdateOrganization",
    label: "Update Organization Settings",
    category: "organization",
    actionType: "write",
    riskLevel: "medium",
    description: "Modify tenant name, slug, and organization settings"
  },
  "tenant:ReadAnalytics": {
    id: "tenant:ReadAnalytics",
    label: "View Executive Analytics",
    category: "organization",
    actionType: "read",
    riskLevel: "low",
    description: "View high-level tenant usage and reporting analytics"
  },
  "tenant:ListWorkspaces": {
    id: "tenant:ListWorkspaces",
    label: "List Workspaces",
    category: "workspaces",
    actionType: "read",
    riskLevel: "low",
    description: "List all workspaces within the organization"
  },
  "tenant:CreateWorkspace": {
    id: "tenant:CreateWorkspace",
    label: "Create Workspaces",
    category: "workspaces",
    actionType: "write",
    riskLevel: "medium",
    description: "Create new workspaces under the organization"
  },
  "tenant:ManageWorkspaceAdmins": {
    id: "tenant:ManageWorkspaceAdmins",
    label: "Manage Workspace Admins",
    category: "organization",
    actionType: "write",
    riskLevel: "high",
    description: "Assign or revoke workspace administrators"
  },
  "tenant:ListMembers": {
    id: "tenant:ListMembers",
    label: "List Organization Members",
    category: "organization",
    actionType: "read",
    riskLevel: "low",
    description: "View all members in the organization"
  },
  "tenant:ManageMembers": {
    id: "tenant:ManageMembers",
    label: "Manage Organization Members",
    category: "organization",
    actionType: "write",
    riskLevel: "high",
    description: "Invite, update, or remove organization members"
  },
  "tenant:ReadBilling": {
    id: "tenant:ReadBilling",
    label: "View Subscription & Billing",
    category: "billing",
    actionType: "read",
    riskLevel: "medium",
    description: "View tenant subscription plan, invoices, and payment details"
  },
  "tenant:ManageBilling": {
    id: "tenant:ManageBilling",
    label: "Manage Subscription & Billing",
    category: "billing",
    actionType: "write",
    riskLevel: "high",
    description: "Change subscription plan, billing details, and checkout"
  },
  "tenant:ExportData": {
    id: "tenant:ExportData",
    label: "Export Organization Data",
    category: "billing",
    actionType: "export",
    riskLevel: "high",
    description: "Export full tenant data packages and compliance backups"
  },
  "workspace:Access": {
    id: "workspace:Access",
    label: "Access Workspace",
    category: "workspaces",
    actionType: "read",
    riskLevel: "low",
    description: "Access the workspace shell and dashboard"
  },
  "workspace:ReadSettings": {
    id: "workspace:ReadSettings",
    label: "View Workspace Settings",
    category: "workspaces",
    actionType: "read",
    riskLevel: "low",
    description: "View workspace profile and settings"
  },
  "workspace:UpdateSettings": {
    id: "workspace:UpdateSettings",
    label: "Update Workspace Settings",
    category: "workspaces",
    actionType: "write",
    riskLevel: "medium",
    description: "Update workspace configuration and preferences"
  },
  "workspace:ListMembers": {
    id: "workspace:ListMembers",
    label: "List Workspace Members",
    category: "workspaces",
    actionType: "read",
    riskLevel: "low",
    description: "View members of the workspace"
  },
  "workspace:ManageMembers": {
    id: "workspace:ManageMembers",
    label: "Manage Workspace Members",
    category: "workspaces",
    actionType: "write",
    riskLevel: "medium",
    description: "Invite, edit, or remove workspace team members"
  },
  "workspace:ListProjects": {
    id: "workspace:ListProjects",
    label: "List Workspace Projects",
    category: "projects",
    actionType: "read",
    riskLevel: "low",
    description: "List all projects in the workspace"
  },
  "workspace:CreateProject": {
    id: "workspace:CreateProject",
    label: "Create Projects",
    category: "projects",
    actionType: "write",
    riskLevel: "medium",
    description: "Create new projects in the workspace"
  },
  "workspace:UpdateProject": {
    id: "workspace:UpdateProject",
    label: "Update Workspace Projects",
    category: "projects",
    actionType: "write",
    riskLevel: "medium",
    description: "Modify any project configuration in the workspace"
  },
  "workspace:DeleteProject": {
    id: "workspace:DeleteProject",
    label: "Delete Projects",
    category: "projects",
    actionType: "delete",
    riskLevel: "high",
    description: "Delete projects and associated data from the workspace"
  },
  "workspace:ManageCategories": {
    id: "workspace:ManageCategories",
    label: "Manage Task Categories",
    category: "projects",
    actionType: "write",
    riskLevel: "low",
    description: "Manage global task categories and billing tags"
  },
  "workspace:ReadReports": {
    id: "workspace:ReadReports",
    label: "View Workspace Reports",
    category: "timelogs",
    actionType: "read",
    riskLevel: "low",
    description: "View workspace utilization and hours reports"
  },
  "workspace:CreateExport": {
    id: "workspace:CreateExport",
    label: "Export Workspace Reports",
    category: "timelogs",
    actionType: "export",
    riskLevel: "medium",
    description: "Generate and download workspace reports"
  },
  "workspace:ManageBillingRates": {
    id: "workspace:ManageBillingRates",
    label: "Manage Workspace Billing Rates",
    category: "billing",
    actionType: "write",
    riskLevel: "high",
    description: "Set hourly rates and monetary billing values"
  },
  "workspace:ManageApiKeys": {
    id: "workspace:ManageApiKeys",
    label: "Manage Reporting API Keys",
    category: "workspaces",
    actionType: "write",
    riskLevel: "high",
    description: "Generate or revoke public reporting API keys"
  },
  "workspace:ReadPresence": {
    id: "workspace:ReadPresence",
    label: "View Live Team Status",
    category: "timelogs",
    actionType: "read",
    riskLevel: "low",
    description: "View active user timers and presence status"
  },
  "project:Read": {
    id: "project:Read",
    label: "View Project",
    category: "projects",
    actionType: "read",
    riskLevel: "low",
    description: "View project detail and tasks"
  },
  "project:Update": {
    id: "project:Update",
    label: "Update Project Settings",
    category: "projects",
    actionType: "write",
    riskLevel: "medium",
    description: "Update project metadata and configuration"
  },
  "project:ManageTasks": {
    id: "project:ManageTasks",
    label: "Manage Project Tasks",
    category: "projects",
    actionType: "write",
    riskLevel: "low",
    description: "Create, update, or archive project tasks"
  },
  "project:ListTeam": {
    id: "project:ListTeam",
    label: "List Project Team",
    category: "projects",
    actionType: "read",
    riskLevel: "low",
    description: "View team members assigned to the project"
  },
  "project:ManageTeam": {
    id: "project:ManageTeam",
    label: "Manage Project Team",
    category: "projects",
    actionType: "write",
    riskLevel: "medium",
    description: "Assign or remove project managers and team members"
  },
  "project:ReviewTimesheets": {
    id: "project:ReviewTimesheets",
    label: "Review & Approve Timesheets",
    category: "timelogs",
    actionType: "write",
    riskLevel: "medium",
    description: "Approve or reject submitted project timesheets"
  },
  "project:ReadReports": {
    id: "project:ReadReports",
    label: "View Project Reports",
    category: "timelogs",
    actionType: "read",
    riskLevel: "low",
    description: "View budget and hour reports for the project"
  },
  "project:ReadPresence": {
    id: "project:ReadPresence",
    label: "View Project Activity",
    category: "timelogs",
    actionType: "read",
    riskLevel: "low",
    description: "View real-time project active timers"
  },
  "personal:ManageTimer": {
    id: "personal:ManageTimer",
    label: "Use Personal Timer",
    category: "timelogs",
    actionType: "write",
    riskLevel: "low",
    description: "Start, pause, and stop personal time tracking timer"
  },
  "personal:ManageTimelogs": {
    id: "personal:ManageTimelogs",
    label: "Manage Personal Timelogs",
    category: "timelogs",
    actionType: "write",
    riskLevel: "low",
    description: "Create, edit, or delete personal time logs"
  },
  "personal:SubmitTimesheets": {
    id: "personal:SubmitTimesheets",
    label: "Submit Timesheets",
    category: "timelogs",
    actionType: "write",
    riskLevel: "low",
    description: "Submit weekly timesheets for manager review"
  },
  "personal:ListProjects": {
    id: "personal:ListProjects",
    label: "View Assigned Projects",
    category: "projects",
    actionType: "read",
    riskLevel: "low",
    description: "View projects the user belongs to"
  },
  "personal:ReadNotifications": {
    id: "personal:ReadNotifications",
    label: "View Notifications",
    category: "organization",
    actionType: "read",
    riskLevel: "low",
    description: "Receive and view personal system notifications"
  },
  "personal:ManageProfile": {
    id: "personal:ManageProfile",
    label: "Manage Personal Profile",
    category: "organization",
    actionType: "write",
    riskLevel: "low",
    description: "Update personal profile, avatar, and preferences"
  },
  "personal:CreateExport": {
    id: "personal:CreateExport",
    label: "Export Personal Timelogs",
    category: "timelogs",
    actionType: "export",
    riskLevel: "low",
    description: "Download personal time entry reports"
  }
} as const;

export function getPermissionMeta(id: Permission): PermissionMeta {
  const base = PERMISSION_METADATA[id] ?? {
    id,
    label: id,
    category: "organization",
    actionType: "read",
    riskLevel: "low",
    description: id
  };

  const actionDimension: "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT" =
    base.actionType === "delete"
      ? "DELETE"
      : base.actionType === "export"
        ? "EXPORT"
        : base.id.includes("Create")
          ? "CREATE"
          : base.actionType === "write"
            ? "EDIT"
            : "VIEW";

  const parentGroup =
    base.category === "billing"
      ? "Billing & Data Export"
      : base.category === "workspaces"
        ? "Workspaces & API"
        : base.category === "projects"
          ? "Projects & Tasks"
          : base.category === "timelogs"
            ? "Time Tracking & Approvals"
            : "Organization Settings";

  return {
    ...base,
    parentGroup: (base as any).parentGroup ?? parentGroup,
    actionDimension: (base as any).actionDimension ?? actionDimension
  };
}

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
