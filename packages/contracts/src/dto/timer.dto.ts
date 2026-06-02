import { z } from "zod";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const startTimerSchema = z.object({
  taskId: uuidSchema
});

export const stopTimerSchema = z.object({
  description: z.string().max(2000).optional(),
  isBillable: z.boolean().optional()
});

export const activeTimerSchema = z.object({
  userId: uuidSchema,
  workspaceId: uuidSchema,
  taskId: uuidSchema,
  startedAt: isoDatetimeSchema,
  elapsedSec: z.number().int().nonnegative()
});

export type StartTimerDto = z.infer<typeof startTimerSchema>;
export type StopTimerDto = z.infer<typeof stopTimerSchema>;
export type ActiveTimerDto = z.infer<typeof activeTimerSchema>;
