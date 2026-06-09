import { z } from "zod";
import { userPreferencesSchema } from "../user-preferences";
import { emailSchema, uuidSchema } from "./common.dto";

export const userProfileSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string().min(1).max(120),
  defaultHourlyRate: z.number().nonnegative().nullable(),
  preferences: userPreferencesSchema,
  effectiveDailyTargetHours: z.number().positive().max(24),
  createdAt: z.string().datetime()
});

export const updateUserProfileSchema = z.object({
  name: z.string().min(1).max(120)
});

export const updateUserPreferencesSchema = userPreferencesSchema.partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

export type UserProfileDto = z.infer<typeof userProfileSchema>;
export type UpdateUserProfileDto = z.infer<typeof updateUserProfileSchema>;
export type UpdateUserPreferencesDto = z.infer<typeof updateUserPreferencesSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
