import { z } from "zod";
import { createPaginatedListResponseSchema } from "../pagination";
import {
  billingAlertSchema,
  planLimitsSchema,
  platformRoleSchema,
  subscriptionStatusSchema,
  tenantStatusSchema
} from "../tenant-rbac";
import { emailSchema, isoDatetimeSchema, slugSchema, uuidSchema } from "./common.dto";

export const platformUserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string().min(1).max(120),
  platformRole: platformRoleSchema
});

export const platformSessionSchema = z.object({
  user: platformUserSchema,
  platformRole: platformRoleSchema
});

export const platformSessionWithTokenSchema = platformSessionSchema.extend({
  accessToken: z.string(),
  refreshToken: z.string().optional()
});

export const platformTenantListItemSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(120),
  slug: z.string().min(1),
  status: tenantStatusSchema,
  createdAt: isoDatetimeSchema,
  planSlug: z.string().optional(),
  subscriptionStatus: subscriptionStatusSchema.optional(),
  workspaceCount: z.number().int().nonnegative(),
  memberCount: z.number().int().nonnegative()
});

export const platformTenantSubscriptionSummarySchema = z.object({
  planName: z.string(),
  planSlug: z.string(),
  status: subscriptionStatusSchema,
  trialEndsAt: isoDatetimeSchema.nullable(),
  currentPeriodEnd: isoDatetimeSchema.nullable(),
  billingAlert: billingAlertSchema.optional()
});

export const platformTenantDetailSchema = platformTenantListItemSchema.extend({
  ownerEmail: emailSchema.nullable().optional(),
  subscription: platformTenantSubscriptionSummarySchema.nullable().optional()
});

export const platformTenantListResponseSchema = createPaginatedListResponseSchema(
  platformTenantListItemSchema
);

export const createPlatformTenantFirstWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
  slug: slugSchema.optional()
});

export const createPlatformTenantSchema = z.object({
  organizationName: z.string().min(1).max(120),
  ownerEmail: emailSchema,
  ownerName: z.string().min(1).max(120).optional(),
  planId: uuidSchema,
  subscriptionStatus: z.enum(["trial", "active"]).optional(),
  limitsOverride: planLimitsSchema.partial().optional(),
  firstWorkspace: createPlatformTenantFirstWorkspaceSchema.optional()
});

export const updatePlatformTenantSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    slug: slugSchema.optional(),
    status: z.enum(["active", "suspended", "churned"]).optional(),
    planId: uuidSchema.optional(),
    subscriptionStatus: subscriptionStatusSchema.optional(),
    limitsOverride: planLimitsSchema.partial().nullable().optional(),
    exportWaived: z.boolean().optional()
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.slug !== undefined ||
      value.status !== undefined ||
      value.planId !== undefined ||
      value.subscriptionStatus !== undefined ||
      value.limitsOverride !== undefined ||
      value.exportWaived !== undefined,
    { message: "At least one field is required" }
  );

export const createPlatformTenantResponseSchema = z.object({
  tenant: platformTenantDetailSchema,
  ownerUserId: uuidSchema,
  temporaryPassword: z.string().optional()
});

export const platformPlanListItemSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(120),
  slug: z.string().min(1),
  isPublic: z.boolean(),
  limits: planLimitsSchema
});

export const platformPlanListResponseSchema = z.object({
  items: z.array(platformPlanListItemSchema)
});

export const platformOpsQueueCountsSchema = z.object({
  waiting: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  delayed: z.number().int().nonnegative()
});

export const platformOpsSummarySchema = z.object({
  tenants: z.object({
    active: z.number().int().nonnegative(),
    trial: z.number().int().nonnegative(),
    suspended: z.number().int().nonnegative(),
    churned: z.number().int().nonnegative(),
    pendingSetup: z.number().int().nonnegative()
  }),
  subscriptions: z.object({
    active: z.number().int().nonnegative(),
    trial: z.number().int().nonnegative(),
    pastDue: z.number().int().nonnegative(),
    canceled: z.number().int().nonnegative()
  }),
  usage: z.object({
    totalWorkspaces: z.number().int().nonnegative(),
    totalSeats: z.number().int().nonnegative()
  }),
  queues: z.record(platformOpsQueueCountsSchema),
  mrr: z
    .object({
      currency: z.literal("usd"),
      amountCents: z.number().int().nonnegative(),
      source: z.literal("stripe")
    })
    .nullable(),
  reconcile: z.object({
    driftCount: z.number().int().nonnegative(),
    lastCheckedAt: isoDatetimeSchema
  })
});

export type PlatformUserDto = z.infer<typeof platformUserSchema>;
export type PlatformSessionDto = z.infer<typeof platformSessionSchema>;
export type PlatformSessionWithTokenDto = z.infer<typeof platformSessionWithTokenSchema>;
export type PlatformTenantListItemDto = z.infer<typeof platformTenantListItemSchema>;
export type PlatformTenantDetailDto = z.infer<typeof platformTenantDetailSchema>;
export type PlatformTenantListResponseDto = z.infer<typeof platformTenantListResponseSchema>;
export type CreatePlatformTenantDto = z.infer<typeof createPlatformTenantSchema>;
export type UpdatePlatformTenantDto = z.infer<typeof updatePlatformTenantSchema>;
export type CreatePlatformTenantResponseDto = z.infer<typeof createPlatformTenantResponseSchema>;
export type PlatformPlanListItemDto = z.infer<typeof platformPlanListItemSchema>;
export type PlatformPlanListResponseDto = z.infer<typeof platformPlanListResponseSchema>;
export type PlatformOpsQueueCountsDto = z.infer<typeof platformOpsQueueCountsSchema>;
export type PlatformOpsSummaryDto = z.infer<typeof platformOpsSummarySchema>;
