import { z } from "zod";
import { isoDatetimeSchema, timelogSourceSchema, uuidSchema } from "./common.dto";

export const timeLogSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  taskId: uuidSchema,
  startTime: isoDatetimeSchema,
  endTime: isoDatetimeSchema,
  durationSec: z.number().int().nonnegative(),
  description: z.string().max(2000).nullable(),
  isBillable: z.boolean(),
  source: timelogSourceSchema
});

export const createTimeLogSchema = z
  .object({
    taskId: uuidSchema,
    startTime: isoDatetimeSchema,
    endTime: isoDatetimeSchema,
    description: z.string().max(2000).optional(),
    isBillable: z.boolean().optional()
  })
  .refine((v) => new Date(v.endTime) >= new Date(v.startTime), {
    message: "endTime must be >= startTime",
    path: ["endTime"]
  });

export const updateTimeLogSchema = z
  .object({
    taskId: uuidSchema.optional(),
    startTime: isoDatetimeSchema.optional(),
    endTime: isoDatetimeSchema.optional(),
    description: z.string().max(2000).nullable().optional(),
    isBillable: z.boolean().optional()
  })
  .refine(
    (v) => {
      if (v.startTime && v.endTime) {
        return new Date(v.endTime) >= new Date(v.startTime);
      }
      return true;
    },
    { message: "endTime must be >= startTime", path: ["endTime"] }
  );

export const listTimeLogsQuerySchema = z.object({
  taskId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  from: isoDatetimeSchema.optional(),
  to: isoDatetimeSchema.optional()
});

export type TimeLogDto = z.infer<typeof timeLogSchema>;
export type CreateTimeLogDto = z.infer<typeof createTimeLogSchema>;
export type UpdateTimeLogDto = z.infer<typeof updateTimeLogSchema>;
export type ListTimeLogsQueryDto = z.infer<typeof listTimeLogsQuerySchema>;
