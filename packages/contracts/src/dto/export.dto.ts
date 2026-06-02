import { z } from "zod";
import { isoDatetimeSchema, uuidSchema } from "./common.dto";

export const exportReportTypeSchema = z.enum([
  "time_entries",
  "daily_summary",
  "by_project",
  "by_member"
]);

export type ExportReportType = z.infer<typeof exportReportTypeSchema>;

export const exportBillableFilterSchema = z.enum(["all", "billable", "non_billable"]);

export type ExportBillableFilter = z.infer<typeof exportBillableFilterSchema>;

export const exportFormatSchema = z.enum(["csv", "xlsx", "pdf"]);

export const TIME_ENTRIES_COLUMNS = [
  "workspace",
  "client",
  "project",
  "task",
  "member",
  "email",
  "date",
  "start_time",
  "end_time",
  "hours",
  "billable",
  "rate",
  "amount",
  "description",
  "source"
] as const;

export const DAILY_SUMMARY_COLUMNS = [
  "date",
  "member",
  "email",
  "client",
  "project",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount"
] as const;

export const BY_PROJECT_COLUMNS = [
  "project",
  "client",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount",
  "active_members"
] as const;

export const BY_MEMBER_COLUMNS = [
  "member",
  "email",
  "total_hours",
  "billable_hours",
  "non_billable_hours",
  "billable_amount"
] as const;

export type TimeEntriesColumn = (typeof TIME_ENTRIES_COLUMNS)[number];
export type DailySummaryColumn = (typeof DAILY_SUMMARY_COLUMNS)[number];
export type ByProjectColumn = (typeof BY_PROJECT_COLUMNS)[number];
export type ByMemberColumn = (typeof BY_MEMBER_COLUMNS)[number];

export const EXPORT_COLUMN_LABELS: Record<
  ExportReportType,
  Record<string, string>
> = {
  time_entries: {
    workspace: "Workspace",
    client: "Client",
    project: "Project",
    task: "Task",
    member: "Member",
    email: "Email",
    date: "Date",
    start_time: "Start",
    end_time: "End",
    hours: "Hours",
    billable: "Billable",
    rate: "Rate",
    amount: "Amount",
    description: "Description",
    source: "Source"
  },
  daily_summary: {
    date: "Date",
    member: "Member",
    email: "Email",
    client: "Client",
    project: "Project",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount"
  },
  by_project: {
    project: "Project",
    client: "Client",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount",
    active_members: "Active members"
  },
  by_member: {
    member: "Member",
    email: "Email",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours",
    billable_amount: "Billable amount"
  }
};

export const DEFAULT_EXPORT_COLUMNS: Record<ExportReportType, readonly string[]> = {
  time_entries: TIME_ENTRIES_COLUMNS,
  daily_summary: DAILY_SUMMARY_COLUMNS,
  by_project: BY_PROJECT_COLUMNS,
  by_member: BY_MEMBER_COLUMNS
};

const columnsForReport = (report: ExportReportType) => {
  const allowed = new Set(Object.keys(EXPORT_COLUMN_LABELS[report]));
  return z
    .array(z.string())
    .min(1)
    .refine((cols) => cols.every((c) => allowed.has(c)), {
      message: `Invalid columns for ${report}`
    });
};

export const exportColumnsSchema = z
  .object({
    time_entries: columnsForReport("time_entries").optional(),
    daily_summary: columnsForReport("daily_summary").optional(),
    by_project: columnsForReport("by_project").optional(),
    by_member: columnsForReport("by_member").optional()
  })
  .optional();

export const exportBodySchema = z.object({
  from: isoDatetimeSchema,
  to: isoDatetimeSchema,
  projectId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  teamOnly: z.boolean().optional(),
  billable: exportBillableFilterSchema.default("all"),
  reportTypes: z.array(exportReportTypeSchema).min(1),
  format: exportFormatSchema,
  columns: exportColumnsSchema
});

export type ExportBodyDto = z.infer<typeof exportBodySchema>;

/** @deprecated GET query — defaults only */
export const exportQuerySchema = z.object({
  from: isoDatetimeSchema,
  to: isoDatetimeSchema,
  projectId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  format: z.enum(["csv", "pdf", "xlsx"])
});

export type ExportQueryDto = z.infer<typeof exportQuerySchema>;

export const memberExportReportTypeSchema = z.enum([
  "time_entries",
  "daily_summary",
  "by_project"
]);

export type MemberExportReportType = z.infer<typeof memberExportReportTypeSchema>;

export const MEMBER_TIME_ENTRIES_COLUMNS = [
  "project",
  "task",
  "date",
  "start_time",
  "end_time",
  "hours",
  "billable",
  "rate",
  "amount",
  "description",
  "source"
] as const;

export const MEMBER_DAILY_SUMMARY_COLUMNS = [
  "date",
  "project",
  "total_hours",
  "billable_hours",
  "non_billable_hours"
] as const;

export const MEMBER_BY_PROJECT_COLUMNS = [
  "project",
  "total_hours",
  "billable_hours",
  "non_billable_hours"
] as const;

export const MEMBER_EXPORT_COLUMN_LABELS: Record<
  MemberExportReportType,
  Record<string, string>
> = {
  time_entries: {
    project: "Project",
    task: "Task",
    date: "Date",
    start_time: "Start",
    end_time: "End",
    hours: "Hours",
    billable: "Billable",
    rate: "Rate",
    amount: "Amount",
    description: "Description",
    source: "Source"
  },
  daily_summary: {
    date: "Date",
    project: "Project",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours"
  },
  by_project: {
    project: "Project",
    total_hours: "Total hours",
    billable_hours: "Billable hours",
    non_billable_hours: "Non-billable hours"
  }
};

export const DEFAULT_MEMBER_EXPORT_COLUMNS: Record<MemberExportReportType, readonly string[]> = {
  time_entries: MEMBER_TIME_ENTRIES_COLUMNS,
  daily_summary: MEMBER_DAILY_SUMMARY_COLUMNS,
  by_project: MEMBER_BY_PROJECT_COLUMNS
};

const memberColumnsForReport = (report: MemberExportReportType) => {
  const allowed = new Set(Object.keys(MEMBER_EXPORT_COLUMN_LABELS[report]));
  return z
    .array(z.string())
    .min(1)
    .refine((cols) => cols.every((c) => allowed.has(c)), {
      message: `Invalid columns for ${report}`
    });
};

export const memberExportColumnsSchema = z
  .object({
    time_entries: memberColumnsForReport("time_entries").optional(),
    daily_summary: memberColumnsForReport("daily_summary").optional(),
    by_project: memberColumnsForReport("by_project").optional()
  })
  .optional();

export const memberExportBodySchema = z.object({
  from: isoDatetimeSchema,
  to: isoDatetimeSchema,
  projectId: uuidSchema.optional(),
  billable: exportBillableFilterSchema.default("all"),
  reportTypes: z.array(memberExportReportTypeSchema).min(1).default(["time_entries"]),
  format: exportFormatSchema,
  columns: memberExportColumnsSchema
});

export type MemberExportBodyDto = z.infer<typeof memberExportBodySchema>;

export function resolveExportColumns(
  report: ExportReportType,
  columns?: Partial<Record<ExportReportType, string[]>>
): string[] {
  const selected = columns?.[report];
  if (selected?.length) return selected;
  return [...DEFAULT_EXPORT_COLUMNS[report]];
}

export function resolveMemberExportColumns(
  report: MemberExportReportType,
  columns?: Partial<Record<MemberExportReportType, string[]>>
): string[] {
  const selected = columns?.[report];
  if (selected?.length) return selected;
  return [...DEFAULT_MEMBER_EXPORT_COLUMNS[report]];
}
