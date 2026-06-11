import { z } from "zod";

// ── Connection ────────────────────────────────────────────────────────────────

export const jiraConnectionStatusSchema = z.object({
  connected: z.boolean(),
  siteUrl: z.string().optional(),
  siteName: z.string().optional(),
  email: z.string().optional(),
  isActive: z.boolean().optional(),
  lastSyncAt: z.coerce.date().nullable().optional(),
  connectedAt: z.coerce.date().optional()
});

export type JiraConnectionStatusDto = z.infer<typeof jiraConnectionStatusSchema>;

// ── Projects ─────────────────────────────────────────────────────────────────

export const jiraProjectSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  projectTypeKey: z.string().optional(),
  avatarUrl: z.string().optional()
});

export const jiraProjectMappingSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  jiraProjectId: z.string(),
  jiraProjectKey: z.string(),
  jiraProjectName: z.string(),
  chronoProjectId: z.string().nullable(),
  syncEnabled: z.boolean(),
  syncDirection: z.string(),
  lastSyncAt: z.coerce.date().nullable()
});

export const upsertProjectMappingSchema = z.object({
  jiraProjectId: z.string().min(1),
  jiraProjectKey: z.string().min(1),
  jiraProjectName: z.string().min(1),
  chronoProjectId: z.string().nullable(),
  syncEnabled: z.boolean().optional().default(true),
  syncDirection: z
    .enum(["JIRA_TO_CHRONO", "CHRONO_TO_JIRA", "BIDIRECTIONAL"])
    .optional()
    .default("JIRA_TO_CHRONO")
});

export type JiraProjectDto = z.infer<typeof jiraProjectSchema>;
export type JiraProjectMappingDto = z.infer<typeof jiraProjectMappingSchema>;
export type UpsertProjectMappingDto = z.infer<typeof upsertProjectMappingSchema>;

// ── Issues ────────────────────────────────────────────────────────────────────

export const jiraIssueSchema = z.object({
  id: z.string(),
  jiraIssueId: z.string(),
  jiraIssueKey: z.string(),
  jiraProjectId: z.string(),
  summary: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  issueType: z.string(),
  priority: z.string().nullable(),
  assigneeId: z.string().nullable(),
  storyPoints: z.number().nullable(),
  sprintId: z.string().nullable(),
  sprintName: z.string().nullable(),
  labels: z.array(z.string()),
  dueDate: z.coerce.date().nullable(),
  taskId: z.string().nullable(),
  cachedAt: z.coerce.date()
});

export const listIssuesQuerySchema = z.object({
  projectKey: z.string().optional(),
  status: z.string().optional(),
  sprintId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(25)
});

export type JiraIssueDto = z.infer<typeof jiraIssueSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;

// ── Users ─────────────────────────────────────────────────────────────────────

export const jiraUserSchema = z.object({
  accountId: z.string(),
  email: z.string(),
  displayName: z.string(),
  active: z.boolean(),
  avatarUrl: z.string().optional()
});

export const jiraUserMappingSchema = z.object({
  id: z.string(),
  jiraAccountId: z.string(),
  jiraEmail: z.string(),
  jiraDisplayName: z.string(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  autoMatched: z.boolean()
});

export const setUserMappingSchema = z.object({
  jiraAccountId: z.string().min(1),
  userId: z.string().nullable()
});

export type JiraUserDto = z.infer<typeof jiraUserSchema>;
export type JiraUserMappingDto = z.infer<typeof jiraUserMappingSchema>;
export type SetUserMappingDto = z.infer<typeof setUserMappingSchema>;

// ── Worklogs ──────────────────────────────────────────────────────────────────

export const jiraWorklogSyncSchema = z.object({
  id: z.string(),
  timeLogId: z.string(),
  jiraIssueKey: z.string(),
  jiraWorklogId: z.string().nullable(),
  status: z.enum(["PENDING", "SYNCED", "FAILED", "SKIPPED"]),
  errorMessage: z.string().nullable(),
  syncedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date()
});

export type JiraWorklogSyncDto = z.infer<typeof jiraWorklogSyncSchema>;

// ── Sync Logs ─────────────────────────────────────────────────────────────────

export const jiraSyncLogSchema = z.object({
  id: z.string(),
  operation: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  status: z.enum(["SUCCESS", "FAILED", "PARTIAL"]),
  message: z.string().nullable(),
  createdAt: z.coerce.date()
});

export const listSyncLogsQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(25)
});

export type JiraSyncLogDto = z.infer<typeof jiraSyncLogSchema>;
export type ListSyncLogsQuery = z.infer<typeof listSyncLogsQuerySchema>;

// ── Sprints ───────────────────────────────────────────────────────────────────

export const jiraSprintSchema = z.object({
  id: z.number(),
  name: z.string(),
  state: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export type JiraSprintDto = z.infer<typeof jiraSprintSchema>;
