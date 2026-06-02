import { z } from "zod";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const hourlyRateSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
  userId: uuidSchema.nullable(),
  projectId: uuidSchema.nullable(),
  rate: z.number().positive(),
  effectiveFrom: isoDatetimeSchema
});

export const createHourlyRateSchema = z.object({
  userId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  rate: z.number().positive(),
  effectiveFrom: isoDatetimeSchema.optional()
});

export const billableSummarySchema = z.object({
  totalHours: z.number(),
  billableHours: z.number(),
  totalAmount: z.number(),
  currency: z.literal("USD")
});

export type HourlyRateDto = z.infer<typeof hourlyRateSchema>;
export type CreateHourlyRateDto = z.infer<typeof createHourlyRateSchema>;
export type BillableSummaryDto = z.infer<typeof billableSummarySchema>;
