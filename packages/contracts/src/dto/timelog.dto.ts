import { z } from "zod";
import {
  halfDaySlotSchema,
  nonProjectTimeFilterSchema,
  timeLogClassificationSchema
} from "../non-project-time";
import {
  assertMaxDateRange,
  isoDatetimeSchema,
  timelogSourceSchema,
  uuidSchema,
  queryUuidArraySchema
} from "./common.dto";

const queryClassificationArraySchema = z.preprocess((val) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val === "string")
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  if (Array.isArray(val)) return val;
  return [val];
}, z.array(timeLogClassificationSchema).optional());

export const timeLogSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
  taskId: uuidSchema.nullable(),
  classification: timeLogClassificationSchema.default("PROJECT"),
  tenantId: uuidSchema.nullable().optional(),
  workspaceId: uuidSchema.nullable().optional(),
  activityTypeId: uuidSchema.nullable().optional(),
  holidayId: uuidSchema.nullable().optional(),
  activityTypeName: z.string().nullable().optional(),
  holidayName: z.string().nullable().optional(),
  startTime: isoDatetimeSchema,
  endTime: isoDatetimeSchema,
  durationSec: z.number().int().nonnegative(),
  description: z.string().max(2000).nullable(),
  isBillable: z.boolean(),
  source: timelogSourceSchema
});

export const createTimeLogSchema = z
  .object({
    classification: timeLogClassificationSchema.default("PROJECT"),
    taskId: uuidSchema.nullable().optional(),
    activityTypeId: uuidSchema.nullable().optional(),
    holidayId: uuidSchema.nullable().optional(),
    halfDaySlot: halfDaySlotSchema.optional(),
    startTime: isoDatetimeSchema,
    endTime: isoDatetimeSchema.optional(),
    description: z.string().max(2000).optional(),
    isBillable: z.boolean().optional()
  })
  .superRefine((v, ctx) => {
    if (v.classification === "PROJECT") {
      if (!v.taskId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "taskId is required for project time",
          path: ["taskId"]
        });
      }
      if (!v.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endTime is required for project time",
          path: ["endTime"]
        });
      }
    }
    if (v.classification === "TENANT_ACTIVITY") {
      if (!v.activityTypeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "activityTypeId is required for organization activities",
          path: ["activityTypeId"]
        });
      }
      if (!v.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endTime is required for organization activities",
          path: ["endTime"]
        });
      }
    }
    if (v.endTime && new Date(v.endTime) < new Date(v.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endTime must be >= startTime",
        path: ["endTime"]
      });
    }
  });

export const updateTimeLogSchema = z
  .object({
    classification: timeLogClassificationSchema.optional(),
    taskId: uuidSchema.nullable().optional(),
    activityTypeId: uuidSchema.nullable().optional(),
    holidayId: uuidSchema.nullable().optional(),
    halfDaySlot: halfDaySlotSchema.optional(),
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

const listTimeLogsBillableOnlySchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    return value === true || value === "true";
  });

export const listTimeLogsQuerySchema = z
  .object({
    taskId: uuidSchema.optional(),
    projectId: queryUuidArraySchema,
    categoryId: uuidSchema.optional(),
    userId: queryUuidArraySchema,
    from: isoDatetimeSchema.optional(),
    to: isoDatetimeSchema.optional(),
    search: z.string().trim().min(1).max(200).optional(),
    billableOnly: listTimeLogsBillableOnlySchema,
    nonProjectTime: nonProjectTimeFilterSchema.optional(),
    classifications: queryClassificationArraySchema,
    limit: z.coerce.number().int().min(1).max(1000).optional(),
    cursor: z.string().optional()
  })
  .superRefine((v, ctx) => {
    if (v.from && v.to) assertMaxDateRange(v.from, v.to, ctx);
  });

export const listTimeLogsResponseSchema = z.object({
  items: z.array(timeLogSchema),
  nextCursor: z.string().optional()
});

export const createBatchTimeLogsSchema = z
  .object({
    classification: timeLogClassificationSchema.default("PROJECT"),
    taskId: uuidSchema.optional(),
    activityTypeId: uuidSchema.optional(),
    holidayId: uuidSchema.optional(),
    halfDaySlot: halfDaySlotSchema.optional(),
    localStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
    localEndTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Format must be HH:MM")
      .optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
    recurrence: z.enum(["daily", "weekdays", "weekly"]),
    timezone: z.string(),
    description: z.string().max(2000).optional(),
    isBillable: z.boolean().optional()
  })
  .superRefine((v, ctx) => {
    if (v.endDate < v.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate must be >= startDate",
        path: ["endDate"]
      });
    }
    if (v.classification === "PROJECT" && !v.taskId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "taskId is required for project time",
        path: ["taskId"]
      });
    }
    if (v.classification === "TENANT_ACTIVITY" && !v.activityTypeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "activityTypeId is required for organization activities",
        path: ["activityTypeId"]
      });
    }
    if (v.localEndTime && v.localEndTime <= v.localStartTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "localEndTime must be > localStartTime",
        path: ["localEndTime"]
      });
    }
    if (
      (v.classification === "PROJECT" || v.classification === "TENANT_ACTIVITY") &&
      !v.localEndTime
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "localEndTime is required",
        path: ["localEndTime"]
      });
    }
  });

export const batchTimeLogsResponseSchema = z.object({
  createdCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  items: z.array(timeLogSchema),
  skipped: z.array(
    z.object({
      date: z.string(),
      reason: z.string()
    })
  )
});

/** Max rows accepted in a single member time-entry import file. */
export const TIMELOG_IMPORT_MAX_ROWS = 500;

export const TIMELOG_IMPORT_COLUMNS = [
  "project",
  "task",
  "date",
  "start_time",
  "end_time",
  "description",
  "billable"
] as const;

/** Human headers for the import template (aligned with member time-entry export labels). */
export const TIMELOG_IMPORT_COLUMN_LABELS: Record<(typeof TIMELOG_IMPORT_COLUMNS)[number], string> =
  {
    project: "Project",
    task: "Task",
    date: "Date",
    start_time: "Start",
    end_time: "End",
    description: "Description",
    billable: "Billable"
  };

export const timelogImportRowSchema = z.object({
  project: z.string().trim().min(1).max(200),
  task: z.string().trim().min(1).max(200),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  start_time: z
    .string()
    .trim()
    .regex(/^\d{1,2}:\d{2}$/, "start_time must be HH:mm"),
  end_time: z
    .string()
    .trim()
    .regex(/^\d{1,2}:\d{2}$/, "end_time must be HH:mm"),
  description: z.string().trim().max(2000).optional(),
  billable: z.union([z.boolean(), z.enum(["true", "false", "yes", "no", "1", "0"])]).optional()
});

export const timelogImportFailedRowSchema = z.object({
  row: z.number().int().positive(),
  reason: z.string().min(1)
});

export const timelogImportResponseSchema = z.object({
  created: z.number().int().nonnegative(),
  /** Rows that already match an existing entry (same task + start/end); not created again. */
  skipped: z.number().int().nonnegative().default(0),
  failed: z.array(timelogImportFailedRowSchema)
});

export type TimeLogDto = z.infer<typeof timeLogSchema>;
export type CreateTimeLogDto = z.input<typeof createTimeLogSchema>;
export type UpdateTimeLogDto = z.infer<typeof updateTimeLogSchema>;
export type ListTimeLogsQueryDto = z.infer<typeof listTimeLogsQuerySchema>;
export type ListTimeLogsResponseDto = z.infer<typeof listTimeLogsResponseSchema>;
export type CreateBatchTimeLogsDto = z.input<typeof createBatchTimeLogsSchema>;
export type BatchTimeLogsResponseDto = z.infer<typeof batchTimeLogsResponseSchema>;
export type TimelogImportRowDto = z.infer<typeof timelogImportRowSchema>;
export type TimelogImportResponseDto = z.infer<typeof timelogImportResponseSchema>;
