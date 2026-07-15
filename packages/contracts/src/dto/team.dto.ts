import { z } from "zod";
import { listPaginationQuerySchema } from "../pagination";
import { teamMemberRoleSchema } from "../tenant-rbac";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const teamMemberSchema = z.object({
  id: uuidSchema,
  teamId: uuidSchema,
  userId: uuidSchema,
  userName: z.string(),
  userEmail: z.string().email(),
  role: teamMemberRoleSchema,
  isActive: z.boolean(),
  /** When the member was added to this project team. */
  createdAt: isoDatetimeSchema.optional()
});

export const updateTeamMemberSchema = z
  .object({
    isActive: z.boolean().optional(),
    role: teamMemberRoleSchema.optional()
  })
  .refine((value) => value.isActive !== undefined || value.role !== undefined, {
    message: "At least one of isActive or role is required"
  });

export const addTeamMemberSchema = z.object({
  userId: uuidSchema
});

/** Provision outside-workspace users onto workspace + this project in one call. */
export const provisionProjectTeamMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120)
});

export const provisionProjectTeamMembersSchema = z.object({
  members: z.array(provisionProjectTeamMemberSchema).min(1).max(100)
});

export const provisionProjectTeamMemberResultSchema = z.object({
  email: z.string().email(),
  status: z.enum(["added", "workspace_invited_and_added", "already_on_team", "failed"]),
  member: teamMemberSchema.optional(),
  userCreated: z.boolean().optional(),
  emailSent: z.boolean().optional(),
  error: z.string().optional()
});

/** Chip invite & Excel/CSV upload both enqueue the same Bull job. */
export const provisionProjectTeamMembersResponseSchema = z.object({
  jobId: z.string().min(1),
  status: z.literal("queued"),
  enqueuedCount: z.number().int().nonnegative()
});

export const teamSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectName: z.string(),
  members: z.array(teamMemberSchema)
});

export const createTeamInviteSchema = z.object({
  email: z.string().email().optional()
});

export const teamInviteSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectName: z.string(),
  token: z.string(),
  email: z.string().email().nullable(),
  inviteUrl: z.string().url(),
  expiresAt: isoDatetimeSchema,
  acceptedAt: isoDatetimeSchema.nullable()
});

export const teamInvitePreviewSchema = z.object({
  projectName: z.string(),
  workspaceName: z.string(),
  email: z.string().email().nullable(),
  expiresAt: isoDatetimeSchema,
  expired: z.boolean()
});

export const listProjectTeamQuerySchema = listPaginationQuerySchema.extend({
  role: teamMemberRoleSchema.optional()
});

export const projectTeamResponseSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  projectName: z.string(),
  members: z.array(teamMemberSchema),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export type TeamMemberDto = z.infer<typeof teamMemberSchema>;
export type UpdateTeamMemberDto = z.infer<typeof updateTeamMemberSchema>;
export type AddTeamMemberDto = z.infer<typeof addTeamMemberSchema>;
export type ProvisionProjectTeamMemberDto = z.infer<typeof provisionProjectTeamMemberSchema>;
export type ProvisionProjectTeamMembersDto = z.infer<typeof provisionProjectTeamMembersSchema>;
export type ProvisionProjectTeamMemberResultDto = z.infer<
  typeof provisionProjectTeamMemberResultSchema
>;
export type ProvisionProjectTeamMembersResponseDto = z.infer<
  typeof provisionProjectTeamMembersResponseSchema
>;
export type TeamDto = z.infer<typeof teamSchema>;
export type ListProjectTeamQuery = z.infer<typeof listProjectTeamQuerySchema>;
export type ProjectTeamResponseDto = z.infer<typeof projectTeamResponseSchema>;
export type CreateTeamInviteDto = z.infer<typeof createTeamInviteSchema>;
export type TeamInviteDto = z.infer<typeof teamInviteSchema>;
export type TeamInvitePreviewDto = z.infer<typeof teamInvitePreviewSchema>;

// Back-compat aliases (prefer Team* names in new code)
export const projectMemberSchema = teamMemberSchema;
export const createProjectInviteSchema = createTeamInviteSchema;
export const projectInviteSchema = teamInviteSchema;
export const projectInvitePreviewSchema = teamInvitePreviewSchema;
export type ProjectMemberDto = TeamMemberDto;
export type CreateProjectInviteDto = CreateTeamInviteDto;
export type ProjectInviteDto = TeamInviteDto;
export type ProjectInvitePreviewDto = TeamInvitePreviewDto;
