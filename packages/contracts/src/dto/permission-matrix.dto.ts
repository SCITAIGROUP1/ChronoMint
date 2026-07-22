import { z } from "zod";
import { paginatedResponseMetaSchema } from "../pagination";
import {
  managedRoleSchema,
  permissionActionDimensionSchema,
  permissionEnforcementStatusSchema,
  permissionFamilySchema,
  permissionLifecycleSchema,
  permissionRiskSchema,
  permissionSchema,
  resourceScopeSchema
} from "../permissions";

export const permissionCategorySchema = z.enum([
  "organization",
  "billing",
  "workspaces",
  "projects",
  "timelogs"
]);
export type PermissionCategoryDto = z.infer<typeof permissionCategorySchema>;

/** @deprecated V2 metadata uses permissionActionDimensionSchema. */
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

/** @deprecated Use permissionRiskSchema. */
export const permissionRiskLevelSchema = permissionRiskSchema;
export type PermissionRiskLevelDto = z.infer<typeof permissionRiskLevelSchema>;

export const policyConfigurationSchema = z.enum(["INHERIT", "ALLOW", "DENY"]);
export type PolicyConfigurationDto = z.infer<typeof policyConfigurationSchema>;

export const effectivePolicyEffectSchema = z.enum(["ALLOW", "DENY"]);
export type EffectivePolicyEffectDto = z.infer<typeof effectivePolicyEffectSchema>;

export const effectivePolicySourceSchema = z.enum([
  "SYSTEM_DENY",
  "PRINCIPAL_DENY",
  "PRINCIPAL_ALLOW",
  "ROLE_POLICY",
  "CANONICAL_ROLE",
  "DEFAULT_DENY"
]);
export type EffectivePolicySourceDto = z.infer<typeof effectivePolicySourceSchema>;

export const policyTargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ROLE"),
    role: managedRoleSchema,
    scope: resourceScopeSchema,
    resourceId: z.string().min(1)
  }),
  z.object({
    type: z.literal("PRINCIPAL"),
    principalId: z.string().min(1),
    scope: resourceScopeSchema,
    resourceId: z.string().min(1)
  })
]);
export type PolicyTargetDto = z.infer<typeof policyTargetSchema>;

export const permissionCatalogItemSchema = z.object({
  id: permissionSchema,
  label: z.string().min(1),
  description: z.string().min(1),
  resourceScope: resourceScopeSchema,
  resourceFamily: permissionFamilySchema,
  parentGroup: z.string().min(1),
  actionDimension: permissionActionDimensionSchema,
  riskLevel: permissionRiskSchema,
  customizable: z.boolean(),
  applicableTargetRoles: z.array(managedRoleSchema),
  lifecycle: permissionLifecycleSchema,
  enforcementStatus: permissionEnforcementStatusSchema
});
export type PermissionCatalogItemDto = z.infer<typeof permissionCatalogItemSchema>;

export const effectivePermissionItemSchema = z.object({
  permission: permissionSchema,
  target: policyTargetSchema,
  configured: policyConfigurationSchema,
  effective: effectivePolicyEffectSchema,
  source: effectivePolicySourceSchema,
  sourceRole: managedRoleSchema.optional(),
  reason: z.string().min(1).optional()
});
export type EffectivePermissionItemDto = z.infer<typeof effectivePermissionItemSchema>;

export const permissionPolicyDocumentSchema = z.object({
  policyVersion: z.string().min(1),
  policyChecksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  revision: z.number().int().nonnegative(),
  target: policyTargetSchema,
  items: z.array(effectivePermissionItemSchema)
});
export type PermissionPolicyDocumentDto = z.infer<typeof permissionPolicyDocumentSchema>;

export const policyMutationSchema = z.object({
  permission: permissionSchema,
  target: policyTargetSchema,
  configured: policyConfigurationSchema
});
export type PolicyMutationDto = z.infer<typeof policyMutationSchema>;

export const batchPolicyMutationSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().trim().min(8).max(200),
  reason: z.string().trim().min(3).max(500),
  atomic: z.literal(true),
  mutations: z.array(policyMutationSchema).min(1).max(500)
});
export type BatchPolicyMutationDto = z.infer<typeof batchPolicyMutationSchema>;

export const resetPolicySchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().trim().min(8).max(200),
  reason: z.string().trim().min(3).max(500),
  target: policyTargetSchema
});
export type ResetPolicyDto = z.infer<typeof resetPolicySchema>;

export const policyMutationResultSchema = z.object({
  policyVersion: z.string().min(1),
  previousRevision: z.number().int().nonnegative(),
  revision: z.number().int().positive(),
  target: policyTargetSchema,
  items: z.array(effectivePermissionItemSchema)
});
export type PolicyMutationResultDto = z.infer<typeof policyMutationResultSchema>;

export const policyFieldConflictSchema = z.object({
  mutationIndex: z.number().int().nonnegative().optional(),
  field: z.enum(["revision", "target", "permission", "configured", "resourceId"]),
  expected: z.union([z.string(), z.number(), z.null()]),
  actual: z.union([z.string(), z.number(), z.null()]),
  message: z.string().min(1)
});
export type PolicyFieldConflictDto = z.infer<typeof policyFieldConflictSchema>;

export const policyConflictResponseSchema = z.object({
  code: z.literal("POLICY_CONFLICT"),
  expectedRevision: z.number().int().nonnegative(),
  actualRevision: z.number().int().nonnegative(),
  conflicts: z.array(policyFieldConflictSchema).min(1)
});
export type PolicyConflictResponseDto = z.infer<typeof policyConflictResponseSchema>;

export const policyDirectoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(200).optional(),
  scope: resourceScopeSchema.optional(),
  resourceId: z.string().min(1).optional()
});
export type PolicyDirectoryQueryDto = z.infer<typeof policyDirectoryQuerySchema>;

export const rolePolicyDirectoryItemSchema = z.object({
  target: policyTargetSchema.and(z.object({ type: z.literal("ROLE") })),
  displayName: z.string().min(1),
  immutable: z.boolean(),
  customizationEnabled: z.boolean(),
  overrideCount: z.number().int().nonnegative()
});
export type RolePolicyDirectoryItemDto = z.infer<typeof rolePolicyDirectoryItemSchema>;

export const principalPolicyDirectoryItemSchema = z.object({
  target: policyTargetSchema.and(z.object({ type: z.literal("PRINCIPAL") })),
  displayName: z.string().min(1),
  email: z.string().email(),
  active: z.boolean(),
  roles: z.array(managedRoleSchema),
  overrideCount: z.number().int().nonnegative()
});
export type PrincipalPolicyDirectoryItemDto = z.infer<typeof principalPolicyDirectoryItemSchema>;

export const rolePolicyDirectorySchema = paginatedResponseMetaSchema.extend({
  items: z.array(rolePolicyDirectoryItemSchema)
});
export type RolePolicyDirectoryDto = z.infer<typeof rolePolicyDirectorySchema>;

export const principalPolicyDirectorySchema = paginatedResponseMetaSchema.extend({
  items: z.array(principalPolicyDirectoryItemSchema)
});
export type PrincipalPolicyDirectoryDto = z.infer<typeof principalPolicyDirectorySchema>;

/**
 * Compatibility DTOs for the prototype consumers. New authoritative endpoints must use
 * permissionPolicyDocumentSchema and batchPolicyMutationSchema.
 */
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

/** @deprecated Prototype-only boolean mutation. */
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
  actionDimension: permissionActionDimensionSchema.optional(),
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

/** @deprecated Prototype-only boolean mutation. */
export const updateMemberPermissionSchema = z.object({
  permission: permissionSchema,
  allowed: z.boolean()
});
export type UpdateMemberPermissionDto = z.infer<typeof updateMemberPermissionSchema>;
