import { z } from "zod";
import { hexColorSchema, uuidSchema } from "./common.dto";

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

export const tenantHolidaySchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  date: calendarDateSchema,
  name: z.string().min(1).max(120),
  isActive: z.boolean()
});

export const createTenantHolidaySchema = z.object({
  date: calendarDateSchema,
  name: z.string().min(1).max(120)
});

export const updateTenantHolidaySchema = z.object({
  date: calendarDateSchema.optional(),
  name: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional()
});

export const listTenantHolidaysQuerySchema = z.object({
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
  isActive: z.coerce.boolean().optional()
});

export const listTenantHolidaysResponseSchema = z.object({
  items: z.array(tenantHolidaySchema)
});

export const applyTenantHolidayResponseSchema = z.object({
  createdCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  skipped: z.array(
    z.object({
      userId: uuidSchema,
      reason: z.string()
    })
  )
});

export const tenantActivityTypeSchema = z.object({
  id: uuidSchema,
  tenantId: uuidSchema,
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(64).nullable(),
  color: hexColorSchema,
  isSystem: z.boolean(),
  isActive: z.boolean()
});

export const createTenantActivityTypeSchema = z.object({
  name: z.string().min(1).max(120),
  color: hexColorSchema.optional()
});

export const updateTenantActivityTypeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  color: hexColorSchema.optional(),
  isActive: z.boolean().optional()
});

export const listTenantActivityTypesQuerySchema = z.object({
  isActive: z.coerce.boolean().optional()
});

export const listTenantActivityTypesResponseSchema = z.object({
  items: z.array(tenantActivityTypeSchema)
});

export type TenantHolidayDto = z.infer<typeof tenantHolidaySchema>;
export type CreateTenantHolidayDto = z.infer<typeof createTenantHolidaySchema>;
export type UpdateTenantHolidayDto = z.infer<typeof updateTenantHolidaySchema>;
export type ListTenantHolidaysQueryDto = z.infer<typeof listTenantHolidaysQuerySchema>;
export type ListTenantHolidaysResponseDto = z.infer<typeof listTenantHolidaysResponseSchema>;
export type ApplyTenantHolidayResponseDto = z.infer<typeof applyTenantHolidayResponseSchema>;
export type TenantActivityTypeDto = z.infer<typeof tenantActivityTypeSchema>;
export type CreateTenantActivityTypeDto = z.infer<typeof createTenantActivityTypeSchema>;
export type UpdateTenantActivityTypeDto = z.infer<typeof updateTenantActivityTypeSchema>;
export type ListTenantActivityTypesQueryDto = z.infer<typeof listTenantActivityTypesQuerySchema>;
export type ListTenantActivityTypesResponseDto = z.infer<
  typeof listTenantActivityTypesResponseSchema
>;
