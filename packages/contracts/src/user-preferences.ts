import { z } from "zod";

export const userPreferencesSchema = z
  .object({
    dailyTargetHours: z.number().positive().max(24).optional(),
    timezone: z.string().optional(),
    weekStart: z.enum(["monday", "sunday"]).optional()
  })
  .passthrough();

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const DEFAULT_DAILY_TARGET_HOURS = 8;

export function parseUserPreferences(raw: unknown): UserPreferences {
  const parsed = userPreferencesSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

export function resolveEffectiveDailyTargetHours(
  userPreferences: UserPreferences,
  workspaceDailyTargetHours?: number
): number {
  if (typeof userPreferences.dailyTargetHours === "number") {
    return userPreferences.dailyTargetHours;
  }
  if (typeof workspaceDailyTargetHours === "number" && workspaceDailyTargetHours > 0) {
    return workspaceDailyTargetHours;
  }
  return DEFAULT_DAILY_TARGET_HOURS;
}

/** User preference timezone, or browser/system timezone when unset ("Browser default"). */
export function resolveEffectiveTimezone(
  userPreferences: UserPreferences,
  browserTimezone?: string
): string {
  if (userPreferences.timezone) {
    return userPreferences.timezone;
  }
  return browserTimezone || "UTC";
}
