import { z } from "zod";

/** A single role-grant audit event returned from the tenant audit-log endpoint. */
export const roleGrantAuditEventDtoSchema = z.object({
  id: z.string(),
  actorUserId: z.string(),
  actorUserName: z.string().optional(),
  actorUserEmail: z.string().optional(),
  targetUserId: z.string(),
  targetUserName: z.string().optional(),
  targetUserEmail: z.string().optional(),
  role: z.string(),
  scope: z.string(),
  resourceId: z.string(),
  resourceName: z.string().optional(),
  reason: z.string(),
  outcome: z.enum(["GRANTED", "REVOKED"]),
  tenantId: z.string(),
  policyVersion: z.string(),
  priorRole: z.string().optional().nullable(),
  requestId: z.string().optional().nullable(),
  decisionReason: z.string().optional().nullable(),
  actorType: z.string(),
  requestSource: z.string(),
  createdAt: z.string()
});
export type RoleGrantAuditEventDto = z.infer<typeof roleGrantAuditEventDtoSchema>;

export const roleGrantAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  scope: z.enum(["tenant", "workspace", "project"]).optional(),
  outcome: z.enum(["GRANTED", "REVOKED"]).optional(),
  actorUserId: z.string().optional(),
  targetUserId: z.string().optional(),
  resourceId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional()
});
export type RoleGrantAuditQuery = z.infer<typeof roleGrantAuditQuerySchema>;

export const roleGrantAuditPageSchema = z.object({
  data: z.array(roleGrantAuditEventDtoSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number()
});
export type RoleGrantAuditPage = z.infer<typeof roleGrantAuditPageSchema>;
