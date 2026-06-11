import { z } from "zod";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

/** Jira issue key, e.g. PROJ-123 */
export const jiraIssueKeySchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[A-Z][A-Z0-9]+-\d+$/, "Invalid Jira issue key");

export const resolveJiraIssueQuerySchema = z.object({
  issueKey: jiraIssueKeySchema
});

export const jiraProjectKeySchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Z][A-Z0-9]+$/, "Invalid Jira project key");

export const upsertJiraProjectMappingSchema = z.object({
  jiraProjectKey: jiraProjectKeySchema,
  chronomintProjectId: uuidSchema,
  autoCreateTasks: z.boolean().optional(),
  defaultCategoryId: uuidSchema
});

export const upsertJiraProjectMappingsSchema = z.object({
  mappings: z.array(upsertJiraProjectMappingSchema).min(1)
});

export const createPersonalAccessTokenSchema = z.object({
  name: z.string().min(1).max(64)
});

export type ResolveJiraIssueQuery = z.infer<typeof resolveJiraIssueQuerySchema>;
export type UpsertJiraProjectMappingDto = z.infer<typeof upsertJiraProjectMappingSchema>;
export type UpsertJiraProjectMappingsDto = z.infer<typeof upsertJiraProjectMappingsSchema>;
export type CreatePersonalAccessTokenDto = z.infer<typeof createPersonalAccessTokenSchema>;

export interface JiraConnectionStatusDto {
  connected: boolean;
  configured: boolean;
  siteUrl?: string;
  connectedAt?: string;
}

export interface JiraProjectMappingDto {
  id: string;
  jiraProjectKey: string;
  chronomintProjectId: string;
  chronomintProjectName?: string;
  autoCreateTasks: boolean;
  defaultCategoryId: string;
}

export interface JiraResolveIssueDto {
  issueKey: string;
  jiraIssueId: string;
  taskId: string;
  taskName: string;
  projectId: string;
  created: boolean;
}

export interface PersonalAccessTokenDto {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
}

export interface CreatePersonalAccessTokenResponseDto {
  token: string;
  item: PersonalAccessTokenDto;
}

export const jiraConnectionStatusSchema = z.object({
  connected: z.boolean(),
  configured: z.boolean(),
  siteUrl: z.string().url().optional(),
  connectedAt: isoDatetimeSchema.optional()
});
