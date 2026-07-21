import { z } from "zod";
import { managedRoleSchema, permissionSchema } from "../permissions";

export const permissionCategorySchema = z.enum([
  "organization",
  "billing",
  "workspaces",
  "projects",
  "timelogs"
]);
export type PermissionCategoryDto = z.infer<typeof permissionCategorySchema>;

export const permissionActionTypeSchema = z.enum([
  "VIEW",
  "CREATE",
  "EDIT",
  "DELETE",
  "EXPORT",
  "read",
  "write",
  "delete",
  "export"
]);
export type PermissionActionTypeDto = z.infer<typeof permissionActionTypeSchema>;

export const permissionRiskLevelSchema = z.enum(["low", "medium", "high"]);
export type PermissionRiskLevelDto = z.infer<typeof permissionRiskLevelSchema>;

export const permissionMatrixItemSchema = z.object({
  id: permissionSchema,
  label: z.string(),
  category: permissionCategorySchema,
  actionType: permissionActionTypeSchema,
  riskLevel: permissionRiskLevelSchema,
  description: z.string(),
  rolePermissions: z.record(managedRoleSchema, z.boolean())
});
export type PermissionMatrixItemDto = z.infer<typeof permissionMatrixItemSchema>;

export const permissionMatrixSchema = z.object({
  policyVersion: z.string(),
  roles: z.array(managedRoleSchema),
  items: z.array(permissionMatrixItemSchema)
});
export type PermissionMatrixDto = z.infer<typeof permissionMatrixSchema>;

export const updatePermissionMatrixPolicySchema = z.object({
  role: managedRoleSchema,
  permission: permissionSchema,
  allowed: z.boolean()
});
export type UpdatePermissionMatrixPolicyDto = z.infer<typeof updatePermissionMatrixPolicySchema>;

export const memberPermissionItemSchema = z.object({
  id: permissionSchema,
  label: z.string(),
  category: permissionCategorySchema,
  parentGroup: z.string().optional(),
  actionDimension: z.enum(["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"]).optional(),
  riskLevel: permissionRiskLevelSchema,
  description: z.string(),
  allowed: z.boolean(),
  isCustomOverride: z.boolean(),
  inheritedRoleDefault: z.boolean()
});
export type MemberPermissionItemDto = z.infer<typeof memberPermissionItemSchema>;

export const memberPermissionsSchema = z.object({
  memberId: z.string(),
  memberName: z.string(),
  memberEmail: z.string(),
  memberRole: z.string(),
  customOverridesCount: z.number(),
  items: z.array(memberPermissionItemSchema)
});
export type MemberPermissionsDto = z.infer<typeof memberPermissionsSchema>;

export const updateMemberPermissionSchema = z.object({
  permission: permissionSchema,
  allowed: z.boolean()
});
export type UpdateMemberPermissionDto = z.infer<typeof updateMemberPermissionSchema>;
