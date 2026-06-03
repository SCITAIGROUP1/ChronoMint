import { z } from "zod";

export const workspaceSettingsSchema = z
  .object({
    logoUrl: z.string().url().optional(),
    exportFooterNote: z.string().max(500).optional(),
    weekStart: z.enum(["monday", "sunday"]).optional(),
    expectedWeeklyHours: z.number().positive().optional(),
    roundingMinutes: z.number().int().positive().optional()
  })
  .passthrough();

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;

export function parseWorkspaceSettings(raw: unknown): WorkspaceSettings {
  const parsed = workspaceSettingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export const DEFAULT_EXPECTED_WEEKLY_HOURS = 40;
