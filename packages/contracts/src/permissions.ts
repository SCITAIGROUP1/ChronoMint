import { z } from "zod";

export const POLICY_VERSION = "v2" as const;
export type PolicyVersion = typeof POLICY_VERSION;

/**
 * Stable canonical IDs. V2 is additive over the 46-ID V1 catalog.
 * Impersonation, public-token grants, and system authorities are intentionally absent.
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
  "personal:CreateExport",
  "platform:ReadOperations",
  "platform:ReadSubscriptions",
  "platform:ReadPlanCatalog",
  "platform:ManagePlanCatalog",
  "platform:ReadQueues",
  "platform:ManageQueues",
  "platform:ManageSalesInquiries",
  "platform:ManageTenantLimits",
  "platform:ManageTenantSecurity",
  "platform:ExportTenantData",
  "platform:DeleteTenantData",
  "platform:ManageStaff",
  "platform:ReadSupportTickets",
  "platform:ManageSupportTickets",
  "platform:ReadSupportMetrics",
  "platform:ManageSupportQueues",
  "platform:ReadOwnNotifications",
  "platform:ManageOwnProfile",
  "platform:ManageOwnSecurity",
  "tenant:ReadPermissionPolicy",
  "tenant:ManagePermissionPolicy",
  "tenant:ReadPermissionAudit",
  "tenant:ImportData",
  "tenant:ManageSalesInquiry",
  "workspace:ListCategories",
  "workspace:ImportTimelogs",
  "workspace:ReadTimelogAudit",
  "workspace:ReviewTimesheets",
  "workspace:ManageIntegrations",
  "workspace:ManageReportShares",
  "workspace:CreateInvoiceExport",
  "workspace:DownloadExports",
  "workspace:ManageExportConfiguration",
  "workspace:ManageExportShares",
  "personal:ManageAccountSecurity",
  "personal:ManageIntegrations",
  "personal:UseAssistant",
  "personal:ManageNotifications"
] as const;

export const permissionSchema = z.enum(PERMISSIONS);
export type Permission = z.infer<typeof permissionSchema>;

export const resourceScopeSchema = z.enum(["platform", "tenant", "workspace", "project", "self"]);
export type ResourceScope = z.infer<typeof resourceScopeSchema>;

export const permissionFamilySchema = z.enum([
  "platform",
  "tenant",
  "workspace",
  "project",
  "personal"
]);
export type PermissionFamily = z.infer<typeof permissionFamilySchema>;

export const permissionActionDimensionSchema = z.enum([
  "VIEW",
  "CREATE",
  "EDIT",
  "DELETE",
  "EXPORT"
]);
export type PermissionActionDimension = z.infer<typeof permissionActionDimensionSchema>;

export const permissionRiskSchema = z.enum(["low", "medium", "high", "critical"]);
export type PermissionRiskLevel = z.infer<typeof permissionRiskSchema>;

export const permissionLifecycleSchema = z.enum(["retained", "introduced"]);
export type PermissionLifecycle = z.infer<typeof permissionLifecycleSchema>;

export const permissionEnforcementStatusSchema = z.enum(["enforced", "partial", "planned"]);
export type PermissionEnforcementStatus = z.infer<typeof permissionEnforcementStatusSchema>;

export const managedRoleSchema = z.enum([
  "PLATFORM_SUPERADMIN",
  "PLATFORM_SUPPORT",
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "WORKSPACE_ADMIN",
  "WORKSPACE_MEMBER",
  "PROJECT_MANAGER"
]);
export type ManagedRole = z.infer<typeof managedRoleSchema>;

export interface PermissionMeta {
  id: Permission;
  label: string;
  description: string;
  resourceScope: ResourceScope;
  resourceFamily: PermissionFamily;
  parentGroup: string;
  actionDimension: PermissionActionDimension;
  riskLevel: PermissionRiskLevel;
  customizable: boolean;
  applicableTargetRoles: readonly ManagedRole[];
  lifecycle: PermissionLifecycle;
  enforcementStatus: PermissionEnforcementStatus;
  /** @deprecated Use parentGroup. */
  category: "organization" | "billing" | "workspaces" | "projects" | "timelogs";
  /** @deprecated Use actionDimension. */
  actionType: "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT";
}

type LegacyCategory = PermissionMeta["category"];

const metadata = (
  id: Permission,
  label: string,
  description: string,
  resourceScope: ResourceScope,
  resourceFamily: PermissionFamily,
  parentGroup: string,
  actionDimension: PermissionActionDimension,
  riskLevel: PermissionRiskLevel,
  customizable: boolean,
  applicableTargetRoles: readonly ManagedRole[],
  lifecycle: PermissionLifecycle,
  enforcementStatus: PermissionEnforcementStatus,
  category: LegacyCategory
): PermissionMeta => ({
  id,
  label,
  description,
  resourceScope,
  resourceFamily,
  parentGroup,
  actionDimension,
  riskLevel,
  customizable,
  applicableTargetRoles,
  lifecycle,
  enforcementStatus,
  category,
  actionType: actionDimension
});

const PSA = ["PLATFORM_SUPERADMIN"] as const;
const PLATFORM_READ = ["PLATFORM_SUPERADMIN", "PLATFORM_SUPPORT"] as const;
const TENANT_BOTH = ["TENANT_OWNER", "TENANT_ADMIN"] as const;
const TENANT_OWNER = ["TENANT_OWNER"] as const;
const WORKSPACE_BOTH = ["WORKSPACE_ADMIN", "WORKSPACE_MEMBER"] as const;
const WORKSPACE_ADMIN = ["WORKSPACE_ADMIN"] as const;
const PROJECT_MANAGERS = ["WORKSPACE_ADMIN", "PROJECT_MANAGER"] as const;
const PRODUCT_SELF = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "WORKSPACE_ADMIN",
  "WORKSPACE_MEMBER"
] as const;
const WORKSPACE_SELF = ["WORKSPACE_ADMIN", "WORKSPACE_MEMBER"] as const;

/**
 * Explicit catalog metadata. No field is derived from the permission name.
 * Platform policy cannot be customized; owner-only permissions are also non-customizable
 * because the TENANT_OWNER template is immutable.
 */
export const PERMISSION_METADATA: Readonly<Record<Permission, PermissionMeta>> = {
  "platform:AccessConsole": metadata(
    "platform:AccessConsole",
    "Access Platform Console",
    "Open the internal platform console.",
    "platform",
    "platform",
    "Platform access",
    "VIEW",
    "high",
    false,
    PLATFORM_READ,
    "retained",
    "partial",
    "organization"
  ),
  "platform:ListTenants": metadata(
    "platform:ListTenants",
    "List Tenants",
    "View tenants across the platform.",
    "platform",
    "platform",
    "Tenant operations",
    "VIEW",
    "high",
    false,
    PLATFORM_READ,
    "retained",
    "partial",
    "organization"
  ),
  "platform:ManageTenants": metadata(
    "platform:ManageTenants",
    "Manage Tenants",
    "Create, suspend, and update tenants.",
    "platform",
    "platform",
    "Tenant operations",
    "EDIT",
    "critical",
    false,
    PSA,
    "retained",
    "partial",
    "organization"
  ),
  "platform:ReadAuditLog": metadata(
    "platform:ReadAuditLog",
    "Read Platform Audit",
    "View platform operations audit events.",
    "platform",
    "platform",
    "Platform audit",
    "VIEW",
    "high",
    false,
    PLATFORM_READ,
    "retained",
    "partial",
    "organization"
  ),
  "tenant:Access": metadata(
    "tenant:Access",
    "Access Organization",
    "Open the organization administration shell.",
    "tenant",
    "tenant",
    "Organization",
    "VIEW",
    "low",
    true,
    TENANT_BOTH,
    "retained",
    "partial",
    "organization"
  ),
  "tenant:ReadOrganization": metadata(
    "tenant:ReadOrganization",
    "Read Organization",
    "View organization profile and settings.",
    "tenant",
    "tenant",
    "Organization",
    "VIEW",
    "low",
    true,
    TENANT_BOTH,
    "retained",
    "partial",
    "organization"
  ),
  "tenant:UpdateOrganization": metadata(
    "tenant:UpdateOrganization",
    "Update Organization",
    "Change organization profile and settings.",
    "tenant",
    "tenant",
    "Organization",
    "EDIT",
    "medium",
    true,
    TENANT_BOTH,
    "retained",
    "partial",
    "organization"
  ),
  "tenant:ReadAnalytics": metadata(
    "tenant:ReadAnalytics",
    "Read Organization Analytics",
    "View executive organization analytics.",
    "tenant",
    "tenant",
    "Organization analytics",
    "VIEW",
    "medium",
    false,
    TENANT_OWNER,
    "retained",
    "partial",
    "organization"
  ),
  "tenant:ListWorkspaces": metadata(
    "tenant:ListWorkspaces",
    "List Workspaces",
    "View workspaces in the organization.",
    "tenant",
    "tenant",
    "Workspace administration",
    "VIEW",
    "low",
    true,
    TENANT_BOTH,
    "retained",
    "partial",
    "workspaces"
  ),
  "tenant:CreateWorkspace": metadata(
    "tenant:CreateWorkspace",
    "Create Workspaces",
    "Create a workspace in the organization.",
    "tenant",
    "tenant",
    "Workspace administration",
    "CREATE",
    "high",
    true,
    TENANT_BOTH,
    "retained",
    "partial",
    "workspaces"
  ),
  "tenant:ManageWorkspaceAdmins": metadata(
    "tenant:ManageWorkspaceAdmins",
    "Manage Workspace Admins",
    "Assign and revoke workspace administrators.",
    "tenant",
    "tenant",
    "Role delegation",
    "EDIT",
    "high",
    true,
    TENANT_BOTH,
    "retained",
    "enforced",
    "workspaces"
  ),
  "tenant:ListMembers": metadata(
    "tenant:ListMembers",
    "List Organization Members",
    "View organization members.",
    "tenant",
    "tenant",
    "Member administration",
    "VIEW",
    "medium",
    true,
    TENANT_BOTH,
    "retained",
    "partial",
    "organization"
  ),
  "tenant:ManageMembers": metadata(
    "tenant:ManageMembers",
    "Manage Organization Members",
    "Invite, update, and remove organization members.",
    "tenant",
    "tenant",
    "Member administration",
    "EDIT",
    "high",
    false,
    TENANT_OWNER,
    "retained",
    "partial",
    "organization"
  ),
  "tenant:ReadBilling": metadata(
    "tenant:ReadBilling",
    "Read Subscription and Billing",
    "View subscription and billing details.",
    "tenant",
    "tenant",
    "Billing",
    "VIEW",
    "high",
    false,
    TENANT_OWNER,
    "retained",
    "partial",
    "billing"
  ),
  "tenant:ManageBilling": metadata(
    "tenant:ManageBilling",
    "Manage Subscription and Billing",
    "Change subscriptions, checkout, and billing portal settings.",
    "tenant",
    "tenant",
    "Billing",
    "EDIT",
    "critical",
    false,
    TENANT_OWNER,
    "retained",
    "partial",
    "billing"
  ),
  "tenant:ExportData": metadata(
    "tenant:ExportData",
    "Export Organization Data",
    "Create and download organization data exports.",
    "tenant",
    "tenant",
    "Compliance data",
    "EXPORT",
    "critical",
    false,
    TENANT_OWNER,
    "retained",
    "partial",
    "billing"
  ),
  "workspace:Access": metadata(
    "workspace:Access",
    "Access Workspace",
    "Open a workspace through an active binding.",
    "workspace",
    "workspace",
    "Workspace access",
    "VIEW",
    "low",
    true,
    WORKSPACE_BOTH,
    "retained",
    "partial",
    "workspaces"
  ),
  "workspace:ReadSettings": metadata(
    "workspace:ReadSettings",
    "Read Workspace Settings",
    "View workspace settings.",
    "workspace",
    "workspace",
    "Workspace settings",
    "VIEW",
    "low",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "workspaces"
  ),
  "workspace:UpdateSettings": metadata(
    "workspace:UpdateSettings",
    "Update Workspace Settings",
    "Change workspace settings.",
    "workspace",
    "workspace",
    "Workspace settings",
    "EDIT",
    "medium",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "workspaces"
  ),
  "workspace:ListMembers": metadata(
    "workspace:ListMembers",
    "List Workspace Members",
    "View workspace membership.",
    "workspace",
    "workspace",
    "Member administration",
    "VIEW",
    "medium",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "workspaces"
  ),
  "workspace:ManageMembers": metadata(
    "workspace:ManageMembers",
    "Manage Workspace Members",
    "Invite, update, and remove workspace members.",
    "workspace",
    "workspace",
    "Member administration",
    "EDIT",
    "high",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "enforced",
    "workspaces"
  ),
  "workspace:ListProjects": metadata(
    "workspace:ListProjects",
    "List Workspace Projects",
    "View projects visible through the workspace binding.",
    "workspace",
    "workspace",
    "Projects",
    "VIEW",
    "low",
    true,
    WORKSPACE_BOTH,
    "retained",
    "partial",
    "projects"
  ),
  "workspace:CreateProject": metadata(
    "workspace:CreateProject",
    "Create Projects",
    "Create projects in the workspace.",
    "workspace",
    "workspace",
    "Projects",
    "CREATE",
    "medium",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "projects"
  ),
  "workspace:UpdateProject": metadata(
    "workspace:UpdateProject",
    "Update Projects",
    "Update any project in the workspace.",
    "workspace",
    "workspace",
    "Projects",
    "EDIT",
    "medium",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "projects"
  ),
  "workspace:DeleteProject": metadata(
    "workspace:DeleteProject",
    "Delete Projects",
    "Delete projects and associated data.",
    "workspace",
    "workspace",
    "Projects",
    "DELETE",
    "high",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "projects"
  ),
  "workspace:ManageCategories": metadata(
    "workspace:ManageCategories",
    "Manage Categories",
    "Create, update, delete, and bulk import categories.",
    "workspace",
    "workspace",
    "Categories",
    "EDIT",
    "medium",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "projects"
  ),
  "workspace:ReadReports": metadata(
    "workspace:ReadReports",
    "Read Workspace Reports",
    "View workspace-level reporting.",
    "workspace",
    "workspace",
    "Reports",
    "VIEW",
    "high",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "timelogs"
  ),
  "workspace:CreateExport": metadata(
    "workspace:CreateExport",
    "Create Workspace Export",
    "Generate and preview workspace report exports.",
    "workspace",
    "workspace",
    "Exports",
    "EXPORT",
    "high",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "timelogs"
  ),
  "workspace:ManageBillingRates": metadata(
    "workspace:ManageBillingRates",
    "Manage Billing Rates",
    "View and change workspace billing rates.",
    "workspace",
    "workspace",
    "Billing",
    "EDIT",
    "high",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "billing"
  ),
  "workspace:ManageApiKeys": metadata(
    "workspace:ManageApiKeys",
    "Manage Reporting API Keys",
    "Create, update, and revoke reporting API keys.",
    "workspace",
    "workspace",
    "API keys",
    "EDIT",
    "critical",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "workspaces"
  ),
  "workspace:ReadPresence": metadata(
    "workspace:ReadPresence",
    "Read Workspace Presence",
    "View workspace-wide live presence.",
    "workspace",
    "workspace",
    "Presence",
    "VIEW",
    "high",
    true,
    WORKSPACE_ADMIN,
    "retained",
    "partial",
    "timelogs"
  ),
  "project:Read": metadata(
    "project:Read",
    "Read Project",
    "View an assigned project.",
    "project",
    "project",
    "Project access",
    "VIEW",
    "low",
    true,
    PROJECT_MANAGERS,
    "retained",
    "partial",
    "projects"
  ),
  "project:Update": metadata(
    "project:Update",
    "Update Project",
    "Update an assigned project.",
    "project",
    "project",
    "Project settings",
    "EDIT",
    "medium",
    true,
    PROJECT_MANAGERS,
    "retained",
    "partial",
    "projects"
  ),
  "project:ManageTasks": metadata(
    "project:ManageTasks",
    "Manage Project Tasks",
    "Create, update, and delete project tasks.",
    "project",
    "project",
    "Tasks",
    "EDIT",
    "medium",
    true,
    PROJECT_MANAGERS,
    "retained",
    "partial",
    "projects"
  ),
  "project:ListTeam": metadata(
    "project:ListTeam",
    "List Project Team",
    "View the assigned project team.",
    "project",
    "project",
    "Project team",
    "VIEW",
    "medium",
    true,
    PROJECT_MANAGERS,
    "retained",
    "partial",
    "projects"
  ),
  "project:ManageTeam": metadata(
    "project:ManageTeam",
    "Manage Project Team",
    "Assign and remove project team members.",
    "project",
    "project",
    "Project team",
    "EDIT",
    "high",
    true,
    PROJECT_MANAGERS,
    "retained",
    "enforced",
    "projects"
  ),
  "project:ReviewTimesheets": metadata(
    "project:ReviewTimesheets",
    "Review Project Timesheets",
    "Approve and reject timesheets for assigned projects.",
    "project",
    "project",
    "Timesheets",
    "EDIT",
    "high",
    true,
    PROJECT_MANAGERS,
    "retained",
    "partial",
    "timelogs"
  ),
  "project:ReadReports": metadata(
    "project:ReadReports",
    "Read Project Reports",
    "View reports for assigned projects.",
    "project",
    "project",
    "Reports",
    "VIEW",
    "high",
    true,
    PROJECT_MANAGERS,
    "retained",
    "partial",
    "timelogs"
  ),
  "project:ReadPresence": metadata(
    "project:ReadPresence",
    "Read Project Presence",
    "View live presence for assigned projects.",
    "project",
    "project",
    "Presence",
    "VIEW",
    "high",
    true,
    PROJECT_MANAGERS,
    "retained",
    "partial",
    "timelogs"
  ),
  "personal:ManageTimer": metadata(
    "personal:ManageTimer",
    "Manage Personal Timer",
    "Start, pause, resume, stop, and discard the principal's timer.",
    "self",
    "personal",
    "Personal time",
    "EDIT",
    "low",
    true,
    WORKSPACE_SELF,
    "retained",
    "partial",
    "timelogs"
  ),
  "personal:ManageTimelogs": metadata(
    "personal:ManageTimelogs",
    "Manage Personal Timelogs",
    "View and change the principal's timelogs.",
    "self",
    "personal",
    "Personal time",
    "EDIT",
    "medium",
    true,
    WORKSPACE_SELF,
    "retained",
    "partial",
    "timelogs"
  ),
  "personal:SubmitTimesheets": metadata(
    "personal:SubmitTimesheets",
    "Submit Personal Timesheets",
    "Preview, submit, and amend the principal's timesheets.",
    "self",
    "personal",
    "Personal timesheets",
    "EDIT",
    "medium",
    true,
    WORKSPACE_SELF,
    "retained",
    "partial",
    "timelogs"
  ),
  "personal:ListProjects": metadata(
    "personal:ListProjects",
    "List Assigned Projects",
    "View projects assigned to the principal.",
    "self",
    "personal",
    "Personal projects",
    "VIEW",
    "low",
    true,
    WORKSPACE_SELF,
    "retained",
    "partial",
    "projects"
  ),
  "personal:ReadNotifications": metadata(
    "personal:ReadNotifications",
    "Read Notifications",
    "View the principal's product notifications.",
    "self",
    "personal",
    "Notifications",
    "VIEW",
    "low",
    true,
    WORKSPACE_SELF,
    "retained",
    "partial",
    "organization"
  ),
  "personal:ManageProfile": metadata(
    "personal:ManageProfile",
    "Manage Personal Profile",
    "View and change the principal's profile and preferences.",
    "self",
    "personal",
    "Profile",
    "EDIT",
    "medium",
    true,
    PRODUCT_SELF,
    "retained",
    "partial",
    "organization"
  ),
  "personal:CreateExport": metadata(
    "personal:CreateExport",
    "Create Personal Export",
    "Export the principal's own timelogs.",
    "self",
    "personal",
    "Personal exports",
    "EXPORT",
    "medium",
    true,
    WORKSPACE_SELF,
    "retained",
    "partial",
    "timelogs"
  ),
  "platform:ReadOperations": metadata(
    "platform:ReadOperations",
    "Read Operations Summary",
    "View platform operations summaries.",
    "platform",
    "platform",
    "Platform operations",
    "VIEW",
    "high",
    false,
    PLATFORM_READ,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ReadSubscriptions": metadata(
    "platform:ReadSubscriptions",
    "Read Subscriptions",
    "View platform subscription lists, details, and events.",
    "platform",
    "platform",
    "Subscriptions",
    "VIEW",
    "high",
    false,
    PLATFORM_READ,
    "introduced",
    "planned",
    "billing"
  ),
  "platform:ReadPlanCatalog": metadata(
    "platform:ReadPlanCatalog",
    "Read Plan Catalog",
    "View platform plan and catalog settings.",
    "platform",
    "platform",
    "Plan catalog",
    "VIEW",
    "medium",
    false,
    PLATFORM_READ,
    "introduced",
    "planned",
    "billing"
  ),
  "platform:ManagePlanCatalog": metadata(
    "platform:ManagePlanCatalog",
    "Manage Plan Catalog",
    "Change platform plans and catalog settings.",
    "platform",
    "platform",
    "Plan catalog",
    "EDIT",
    "critical",
    false,
    PSA,
    "introduced",
    "planned",
    "billing"
  ),
  "platform:ReadQueues": metadata(
    "platform:ReadQueues",
    "Read Queue Failures",
    "View allowlisted queue failures.",
    "platform",
    "platform",
    "Queue operations",
    "VIEW",
    "high",
    false,
    PSA,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ManageQueues": metadata(
    "platform:ManageQueues",
    "Manage Queues",
    "Retry, pause, and resume allowlisted queues.",
    "platform",
    "platform",
    "Queue operations",
    "EDIT",
    "critical",
    false,
    PSA,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ManageSalesInquiries": metadata(
    "platform:ManageSalesInquiries",
    "Manage Sales Inquiries",
    "View and process tenant sales inquiries and receipts.",
    "platform",
    "platform",
    "Sales operations",
    "EDIT",
    "high",
    false,
    PSA,
    "introduced",
    "planned",
    "billing"
  ),
  "platform:ManageTenantLimits": metadata(
    "platform:ManageTenantLimits",
    "Manage Tenant Limits",
    "Override limits, grace periods, and trials.",
    "platform",
    "platform",
    "Tenant operations",
    "EDIT",
    "critical",
    false,
    PSA,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ManageTenantSecurity": metadata(
    "platform:ManageTenantSecurity",
    "Manage Tenant Security",
    "Revoke tenant sessions and reset MFA.",
    "platform",
    "platform",
    "Tenant security",
    "EDIT",
    "critical",
    false,
    PSA,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ExportTenantData": metadata(
    "platform:ExportTenantData",
    "Export Tenant Data",
    "Initiate a platform GDPR tenant export.",
    "platform",
    "platform",
    "Compliance data",
    "EXPORT",
    "critical",
    false,
    PSA,
    "introduced",
    "planned",
    "billing"
  ),
  "platform:DeleteTenantData": metadata(
    "platform:DeleteTenantData",
    "Delete Tenant Data",
    "Permanently delete tenant data through the GDPR flow.",
    "platform",
    "platform",
    "Compliance data",
    "DELETE",
    "critical",
    false,
    PSA,
    "introduced",
    "planned",
    "billing"
  ),
  "platform:ManageStaff": metadata(
    "platform:ManageStaff",
    "Manage Platform Staff",
    "Create, update, and remove platform staff.",
    "platform",
    "platform",
    "Staff administration",
    "EDIT",
    "critical",
    false,
    PSA,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ReadSupportTickets": metadata(
    "platform:ReadSupportTickets",
    "Read Support Tickets",
    "View support tickets and helpdesk events.",
    "platform",
    "platform",
    "Support",
    "VIEW",
    "high",
    false,
    PLATFORM_READ,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ManageSupportTickets": metadata(
    "platform:ManageSupportTickets",
    "Manage Support Tickets",
    "Update and reply to support tickets.",
    "platform",
    "platform",
    "Support",
    "EDIT",
    "high",
    false,
    PLATFORM_READ,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ReadSupportMetrics": metadata(
    "platform:ReadSupportMetrics",
    "Read Support Metrics",
    "View support performance metrics.",
    "platform",
    "platform",
    "Support",
    "VIEW",
    "high",
    false,
    PLATFORM_READ,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ManageSupportQueues": metadata(
    "platform:ManageSupportQueues",
    "Manage Support Queues",
    "Manage helpdesk queue configuration.",
    "platform",
    "platform",
    "Support",
    "EDIT",
    "high",
    false,
    PSA,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ReadOwnNotifications": metadata(
    "platform:ReadOwnNotifications",
    "Read Own Platform Notifications",
    "View the platform principal's notifications.",
    "platform",
    "platform",
    "Self service",
    "VIEW",
    "low",
    false,
    PLATFORM_READ,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ManageOwnProfile": metadata(
    "platform:ManageOwnProfile",
    "Manage Own Platform Profile",
    "View and change the platform principal's profile.",
    "platform",
    "platform",
    "Self service",
    "EDIT",
    "medium",
    false,
    PLATFORM_READ,
    "introduced",
    "planned",
    "organization"
  ),
  "platform:ManageOwnSecurity": metadata(
    "platform:ManageOwnSecurity",
    "Manage Own Platform Security",
    "Manage the platform principal's password, sessions, and MFA.",
    "platform",
    "platform",
    "Self service",
    "EDIT",
    "high",
    false,
    PLATFORM_READ,
    "introduced",
    "planned",
    "organization"
  ),
  "tenant:ReadPermissionPolicy": metadata(
    "tenant:ReadPermissionPolicy",
    "Read Permission Policy",
    "View managed-role and principal permission policy.",
    "tenant",
    "tenant",
    "Permission policy",
    "VIEW",
    "high",
    true,
    TENANT_BOTH,
    "introduced",
    "planned",
    "organization"
  ),
  "tenant:ManagePermissionPolicy": metadata(
    "tenant:ManagePermissionPolicy",
    "Manage Permission Policy",
    "Mutate delegated role and principal policy below the actor boundary.",
    "tenant",
    "tenant",
    "Permission policy",
    "EDIT",
    "critical",
    true,
    TENANT_BOTH,
    "introduced",
    "planned",
    "organization"
  ),
  "tenant:ReadPermissionAudit": metadata(
    "tenant:ReadPermissionAudit",
    "Read Permission Audit",
    "View append-only permission policy audit records.",
    "tenant",
    "tenant",
    "Permission policy",
    "VIEW",
    "high",
    true,
    TENANT_BOTH,
    "introduced",
    "planned",
    "organization"
  ),
  "tenant:ImportData": metadata(
    "tenant:ImportData",
    "Import Organization Data",
    "Create and inspect organization data imports.",
    "tenant",
    "tenant",
    "Compliance data",
    "CREATE",
    "critical",
    false,
    TENANT_OWNER,
    "introduced",
    "planned",
    "billing"
  ),
  "tenant:ManageSalesInquiry": metadata(
    "tenant:ManageSalesInquiry",
    "Manage Sales Inquiry",
    "Submit sales inquiries and receipts for the organization.",
    "tenant",
    "tenant",
    "Billing",
    "EDIT",
    "high",
    false,
    TENANT_OWNER,
    "introduced",
    "planned",
    "billing"
  ),
  "workspace:ListCategories": metadata(
    "workspace:ListCategories",
    "List Categories",
    "View workspace categories.",
    "workspace",
    "workspace",
    "Categories",
    "VIEW",
    "low",
    true,
    WORKSPACE_BOTH,
    "introduced",
    "planned",
    "projects"
  ),
  "workspace:ImportTimelogs": metadata(
    "workspace:ImportTimelogs",
    "Import Timelogs",
    "Download templates and import workspace timelogs.",
    "workspace",
    "workspace",
    "Time data",
    "CREATE",
    "high",
    true,
    WORKSPACE_ADMIN,
    "introduced",
    "planned",
    "timelogs"
  ),
  "workspace:ReadTimelogAudit": metadata(
    "workspace:ReadTimelogAudit",
    "Read Timelog Audit",
    "View workspace-wide timelog audit events.",
    "workspace",
    "workspace",
    "Time data",
    "VIEW",
    "high",
    true,
    WORKSPACE_ADMIN,
    "introduced",
    "planned",
    "timelogs"
  ),
  "workspace:ReviewTimesheets": metadata(
    "workspace:ReviewTimesheets",
    "Review Workspace Timesheets",
    "Review, remind, approve, and reject timesheets workspace-wide.",
    "workspace",
    "workspace",
    "Timesheets",
    "EDIT",
    "high",
    true,
    WORKSPACE_ADMIN,
    "introduced",
    "planned",
    "timelogs"
  ),
  "workspace:ManageIntegrations": metadata(
    "workspace:ManageIntegrations",
    "Manage Workspace Integrations",
    "Configure and verify workspace integrations.",
    "workspace",
    "workspace",
    "Integrations",
    "EDIT",
    "high",
    true,
    WORKSPACE_ADMIN,
    "introduced",
    "planned",
    "workspaces"
  ),
  "workspace:ManageReportShares": metadata(
    "workspace:ManageReportShares",
    "Manage Report Shares",
    "Create public widget report shares.",
    "workspace",
    "workspace",
    "Report sharing",
    "EDIT",
    "high",
    true,
    WORKSPACE_ADMIN,
    "introduced",
    "planned",
    "timelogs"
  ),
  "workspace:CreateInvoiceExport": metadata(
    "workspace:CreateInvoiceExport",
    "Create Invoice Export",
    "Generate invoice exports.",
    "workspace",
    "workspace",
    "Exports",
    "EXPORT",
    "high",
    true,
    WORKSPACE_ADMIN,
    "introduced",
    "planned",
    "billing"
  ),
  "workspace:DownloadExports": metadata(
    "workspace:DownloadExports",
    "Download Workspace Exports",
    "Retrieve completed workspace export artifacts.",
    "workspace",
    "workspace",
    "Exports",
    "EXPORT",
    "high",
    true,
    WORKSPACE_ADMIN,
    "introduced",
    "planned",
    "timelogs"
  ),
  "workspace:ManageExportConfiguration": metadata(
    "workspace:ManageExportConfiguration",
    "Manage Export Configuration",
    "Manage export presets and schedules.",
    "workspace",
    "workspace",
    "Exports",
    "EDIT",
    "high",
    true,
    WORKSPACE_ADMIN,
    "introduced",
    "planned",
    "timelogs"
  ),
  "workspace:ManageExportShares": metadata(
    "workspace:ManageExportShares",
    "Manage Export Shares",
    "Create public export links.",
    "workspace",
    "workspace",
    "Exports",
    "EDIT",
    "critical",
    true,
    WORKSPACE_ADMIN,
    "introduced",
    "planned",
    "timelogs"
  ),
  "personal:ManageAccountSecurity": metadata(
    "personal:ManageAccountSecurity",
    "Manage Account Security",
    "Manage the principal's password, sessions, MFA, and phone.",
    "self",
    "personal",
    "Account security",
    "EDIT",
    "high",
    true,
    PRODUCT_SELF,
    "introduced",
    "planned",
    "organization"
  ),
  "personal:ManageIntegrations": metadata(
    "personal:ManageIntegrations",
    "Manage Personal Integrations",
    "Manage the principal's integration credentials.",
    "self",
    "personal",
    "Integrations",
    "EDIT",
    "high",
    true,
    WORKSPACE_SELF,
    "introduced",
    "planned",
    "workspaces"
  ),
  "personal:UseAssistant": metadata(
    "personal:UseAssistant",
    "Use Assistant",
    "Use the product assistant when enabled by plan.",
    "self",
    "personal",
    "Assistant",
    "CREATE",
    "medium",
    true,
    WORKSPACE_SELF,
    "introduced",
    "planned",
    "organization"
  ),
  "personal:ManageNotifications": metadata(
    "personal:ManageNotifications",
    "Manage Notifications",
    "Mark the principal's notifications read.",
    "self",
    "personal",
    "Notifications",
    "EDIT",
    "low",
    true,
    WORKSPACE_SELF,
    "introduced",
    "planned",
    "organization"
  )
};

export function getPermissionMeta(id: Permission): PermissionMeta {
  return PERMISSION_METADATA[id];
}

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
};

export const policyEffectSchema = z.enum(["allow", "deny"]);
export type PolicyEffect = z.infer<typeof policyEffectSchema>;

const policyStatementCoreSchema = z.object({
  effect: policyEffectSchema,
  permission: permissionSchema,
  scope: resourceScopeSchema
});

export const policyStatementSchema = policyStatementCoreSchema.superRefine(
  ({ permission, scope }, ctx) => {
    const expectedScope = PERMISSION_METADATA[permission].resourceScope;
    const valid =
      scope === expectedScope ||
      (PERMISSION_METADATA[permission].resourceFamily === "project" && scope === "workspace");
    if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${permission} cannot be granted at ${scope} scope`,
        path: ["scope"]
      });
    }
  }
);
export type PolicyStatement = z.infer<typeof policyStatementCoreSchema>;

export const MANAGED_ROLE_BINDING_SCOPES = {
  PLATFORM_SUPERADMIN: "platform",
  PLATFORM_SUPPORT: "platform",
  TENANT_OWNER: "tenant",
  TENANT_ADMIN: "tenant",
  WORKSPACE_ADMIN: "workspace",
  WORKSPACE_MEMBER: "workspace",
  PROJECT_MANAGER: "project"
} as const satisfies Record<ManagedRole, ResourceScope>;

export const MANAGED_ROLE_POLICY_METADATA = {
  PLATFORM_SUPERADMIN: { immutable: true, customizationEnabled: false },
  PLATFORM_SUPPORT: { immutable: true, customizationEnabled: false },
  TENANT_OWNER: { immutable: true, customizationEnabled: false },
  TENANT_ADMIN: { immutable: false, customizationEnabled: true },
  WORKSPACE_ADMIN: { immutable: false, customizationEnabled: true },
  WORKSPACE_MEMBER: { immutable: false, customizationEnabled: true },
  PROJECT_MANAGER: { immutable: false, customizationEnabled: true }
} as const satisfies Record<ManagedRole, { immutable: boolean; customizationEnabled: boolean }>;

export const ROLE_GRANT_MATRIX: Readonly<Record<ManagedRole, readonly ManagedRole[]>> = {
  PLATFORM_SUPERADMIN: ["PLATFORM_SUPPORT"],
  PLATFORM_SUPPORT: [],
  TENANT_OWNER: ["TENANT_ADMIN", "WORKSPACE_ADMIN", "WORKSPACE_MEMBER"],
  TENANT_ADMIN: ["WORKSPACE_ADMIN", "WORKSPACE_MEMBER"],
  WORKSPACE_ADMIN: ["WORKSPACE_MEMBER", "PROJECT_MANAGER"],
  WORKSPACE_MEMBER: [],
  PROJECT_MANAGER: []
};

const allow = (permission: Permission, scope: ResourceScope): PolicyStatement => ({
  effect: "allow",
  permission,
  scope
});

const PERSONAL_V1_POLICY = [
  allow("personal:ManageTimer", "self"),
  allow("personal:ManageTimelogs", "self"),
  allow("personal:SubmitTimesheets", "self"),
  allow("personal:ListProjects", "self"),
  allow("personal:ReadNotifications", "self"),
  allow("personal:ManageProfile", "self"),
  allow("personal:CreateExport", "self")
] as const;

const PERSONAL_V2_WORKSPACE_POLICY = [
  allow("personal:ManageAccountSecurity", "self"),
  allow("personal:ManageIntegrations", "self"),
  allow("personal:UseAssistant", "self"),
  allow("personal:ManageNotifications", "self")
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

const WORKSPACE_PROJECT_POLICY = PROJECT_MANAGER_POLICY.map((statement) =>
  allow(statement.permission, "workspace")
);

export const MANAGED_ROLE_POLICIES = {
  PLATFORM_SUPERADMIN: [
    allow("platform:AccessConsole", "platform"),
    allow("platform:ListTenants", "platform"),
    allow("platform:ManageTenants", "platform"),
    allow("platform:ReadAuditLog", "platform"),
    allow("platform:ReadOperations", "platform"),
    allow("platform:ReadSubscriptions", "platform"),
    allow("platform:ReadPlanCatalog", "platform"),
    allow("platform:ManagePlanCatalog", "platform"),
    allow("platform:ReadQueues", "platform"),
    allow("platform:ManageQueues", "platform"),
    allow("platform:ManageSalesInquiries", "platform"),
    allow("platform:ManageTenantLimits", "platform"),
    allow("platform:ManageTenantSecurity", "platform"),
    allow("platform:ExportTenantData", "platform"),
    allow("platform:DeleteTenantData", "platform"),
    allow("platform:ManageStaff", "platform"),
    allow("platform:ReadSupportTickets", "platform"),
    allow("platform:ManageSupportTickets", "platform"),
    allow("platform:ReadSupportMetrics", "platform"),
    allow("platform:ManageSupportQueues", "platform"),
    allow("platform:ReadOwnNotifications", "platform"),
    allow("platform:ManageOwnProfile", "platform"),
    allow("platform:ManageOwnSecurity", "platform")
  ],
  PLATFORM_SUPPORT: [
    allow("platform:AccessConsole", "platform"),
    allow("platform:ListTenants", "platform"),
    allow("platform:ReadAuditLog", "platform"),
    allow("platform:ReadOperations", "platform"),
    allow("platform:ReadSubscriptions", "platform"),
    allow("platform:ReadPlanCatalog", "platform"),
    allow("platform:ReadSupportTickets", "platform"),
    allow("platform:ManageSupportTickets", "platform"),
    allow("platform:ReadSupportMetrics", "platform"),
    allow("platform:ReadOwnNotifications", "platform"),
    allow("platform:ManageOwnProfile", "platform"),
    allow("platform:ManageOwnSecurity", "platform")
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
    allow("tenant:ExportData", "tenant"),
    allow("tenant:ReadPermissionPolicy", "tenant"),
    allow("tenant:ManagePermissionPolicy", "tenant"),
    allow("tenant:ReadPermissionAudit", "tenant"),
    allow("tenant:ImportData", "tenant"),
    allow("tenant:ManageSalesInquiry", "tenant"),
    allow("personal:ManageAccountSecurity", "self")
  ],
  TENANT_ADMIN: [
    allow("tenant:Access", "tenant"),
    allow("tenant:ReadOrganization", "tenant"),
    allow("tenant:UpdateOrganization", "tenant"),
    allow("tenant:ListWorkspaces", "tenant"),
    allow("tenant:CreateWorkspace", "tenant"),
    allow("tenant:ManageWorkspaceAdmins", "tenant"),
    allow("personal:ManageAccountSecurity", "self")
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
    allow("workspace:ListCategories", "workspace"),
    allow("workspace:ImportTimelogs", "workspace"),
    allow("workspace:ReadTimelogAudit", "workspace"),
    allow("workspace:ReviewTimesheets", "workspace"),
    allow("workspace:ManageIntegrations", "workspace"),
    allow("workspace:ManageReportShares", "workspace"),
    allow("workspace:CreateInvoiceExport", "workspace"),
    allow("workspace:DownloadExports", "workspace"),
    allow("workspace:ManageExportConfiguration", "workspace"),
    allow("workspace:ManageExportShares", "workspace"),
    ...WORKSPACE_PROJECT_POLICY,
    ...PERSONAL_V1_POLICY,
    ...PERSONAL_V2_WORKSPACE_POLICY
  ],
  WORKSPACE_MEMBER: [
    allow("workspace:Access", "workspace"),
    allow("workspace:ListProjects", "workspace"),
    allow("workspace:ListCategories", "workspace"),
    ...PERSONAL_V1_POLICY,
    ...PERSONAL_V2_WORKSPACE_POLICY
  ],
  PROJECT_MANAGER: PROJECT_MANAGER_POLICY
} as const satisfies Record<ManagedRole, readonly PolicyStatement[]>;

/** Canonical serialization order used to calculate POLICY_CHECKSUM. */
export const POLICY_SNAPSHOT = {
  version: POLICY_VERSION,
  permissions: PERMISSIONS,
  managedRolePolicies: MANAGED_ROLE_POLICIES
} as const;

/** SHA-256 of JSON.stringify(POLICY_SNAPSHOT). Updated only with an intentional policy bump. */
export const POLICY_CHECKSUM =
  "sha256:4ff207ecc9dd196d6a5bdf8e412990540528d2cc5577dc60aac4b0b54b312530" as const;

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

export const capabilityEntrySchema = z.object({
  permission: permissionSchema,
  scope: resourceScopeSchema,
  resourceId: z.string().min(1),
  allowed: z.boolean(),
  source: z.enum(["canonical-role", "role-policy", "principal-policy", "system-deny"]),
  sourceRole: managedRoleSchema.optional()
});
export type ScopedCapabilityEntry = z.infer<typeof capabilityEntrySchema>;

/** Compatibility shape for canonical role templates before concrete bindings are resolved. */
export interface CapabilityEntry {
  permission: Permission;
  scope: ResourceScope;
  resourceId?: string;
}

/**
 * Short-lived UI hint. APIs must never accept this snapshot as authorization evidence.
 */
export const capabilitySnapshotSchema = z.object({
  policyVersion: z.literal(POLICY_VERSION),
  policyChecksum: z.literal(POLICY_CHECKSUM),
  policyRevision: z.number().int().nonnegative(),
  membershipRevision: z.number().int().nonnegative(),
  principalId: z.string().min(1),
  tenantId: z.string().min(1).nullable(),
  computedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  etag: z.string().min(1),
  capabilities: z.array(capabilityEntrySchema)
});
export type CapabilitySnapshot = z.infer<typeof capabilitySnapshotSchema>;

export function getManagedRoleCapabilities(roles: readonly ManagedRole[]): CapabilityEntry[] {
  const seen = new Set<string>();
  const entries: CapabilityEntry[] = [];
  for (const role of roles) {
    for (const statement of MANAGED_ROLE_POLICIES[role] as readonly PolicyStatement[]) {
      if (statement.effect !== "allow") continue;
      const key = `${statement.permission}|${statement.scope}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        permission: statement.permission,
        scope: statement.scope
      });
    }
  }
  return entries;
}

/** @deprecated Use getManagedRoleCapabilities for scoped capability entries. */
export function getManagedRolePermissions(roles: readonly ManagedRole[]): Permission[] {
  return [...new Set(getManagedRoleCapabilities(roles).map(({ permission }) => permission))];
}
