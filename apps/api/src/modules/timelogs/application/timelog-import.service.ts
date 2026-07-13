import {
  TIMELOG_IMPORT_COLUMN_LABELS,
  TIMELOG_IMPORT_COLUMNS,
  TIMELOG_IMPORT_MAX_ROWS,
  timelogImportRowSchema,
  type TimelogImportResponseDto,
  type TimelogImportRowDto
} from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import type { Response } from "express";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { parseWorkspaceSettingsFromRaw } from "../../../common/time/approval-period.util";
import { TimelogsService } from "./timelogs.service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ImportColumn = (typeof TIMELOG_IMPORT_COLUMNS)[number];
type ParsedImportRow = TimelogImportRowDto & { rowNumber: number; invalidReason?: string };
type ColumnMap = Partial<Record<ImportColumn, number>>;

const REQUIRED_IMPORT_COLUMNS = ["project", "task", "date", "start_time", "end_time"] as const;

/** Map export / template / snake_case headers onto import field keys. */
const HEADER_ALIASES: Record<string, ImportColumn> = {
  project: "project",
  task: "task",
  date: "date",
  start: "start_time",
  "start time": "start_time",
  end: "end_time",
  "end time": "end_time",
  description: "description",
  billable: "billable",
  // Keep aliases in sync with TIMELOG_IMPORT_COLUMN_LABELS / member export labels.
  ...Object.fromEntries(
    TIMELOG_IMPORT_COLUMNS.map((key) => [
      TIMELOG_IMPORT_COLUMN_LABELS[key]
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " "),
      key
    ])
  )
};

@Injectable()
export class TimelogImportService {
  constructor(
    private prisma: PrismaService,
    private timelogs: TimelogsService
  ) {}

  async generateTemplate(res: Response) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Time entries");
    sheet.columns = TIMELOG_IMPORT_COLUMNS.map((key) => ({
      header: TIMELOG_IMPORT_COLUMN_LABELS[key],
      key,
      width: key === "description" ? 40 : 18
    }));
    sheet.getRow(1).font = { bold: true };
    sheet.addRow({
      project: "Example Project",
      task: "Example Task",
      date: "2026-07-01",
      start_time: "09:00",
      end_time: "10:30",
      description: "Optional notes",
      billable: "yes"
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=timelog_import_template.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  }

  async importFile(params: {
    workspaceId: string;
    userId: string;
    role: string;
    buffer: Buffer;
    filename?: string;
    timezone?: string;
  }): Promise<TimelogImportResponseDto> {
    const rows = await this.parseFile(params.buffer, params.filename);
    if (rows.length === 0) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No valid time entry rows found in the file",
        HttpStatus.BAD_REQUEST
      );
    }
    if (rows.length > TIMELOG_IMPORT_MAX_ROWS) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        `Maximum ${TIMELOG_IMPORT_MAX_ROWS} rows allowed per import`,
        HttpStatus.BAD_REQUEST
      );
    }

    const timezone = await this.resolveTimezone(params.workspaceId, params.userId, params.timezone);
    const catalog = await this.loadTaskCatalog(params.workspaceId, params.userId, params.role);

    let created = 0;
    let skipped = 0;
    const failed: TimelogImportResponseDto["failed"] = [];

    for (const row of rows) {
      try {
        if (row.invalidReason) {
          throw new Error(row.invalidReason);
        }
        const taskId = this.resolveTaskId(catalog, row.project, row.task);
        const startClock = normalizeClock(row.start_time);
        const endClock = normalizeClock(row.end_time);
        const start = this.timelogs.localTimeToUtc(row.date, startClock, timezone);
        let end = this.timelogs.localTimeToUtc(row.date, endClock, timezone);
        // Export stores overnight shifts as same-date Start/End (e.g. 23:00–03:30).
        if (end.getTime() <= start.getTime()) {
          end = this.timelogs.localTimeToUtc(addOneCalendarDay(row.date), endClock, timezone);
        }
        if (end.getTime() <= start.getTime()) {
          throw new Error("end_time must be after start_time");
        }

        // Re-importing an export: skip if this slot is already covered on the same task.
        const alreadyLogged = await this.findExistingCoverage(params.userId, taskId, start, end);
        if (alreadyLogged) {
          skipped += 1;
          continue;
        }

        await this.timelogs.create(params.workspaceId, params.userId, params.role, {
          taskId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          ...(row.description ? { description: row.description } : {}),
          ...(row.billable !== undefined ? { isBillable: parseBillable(row.billable) } : {})
        });
        created += 1;
      } catch (err) {
        // Re-upload of existing times: overlaps mean the slot is already taken — skip, don't fail.
        if (
          (err instanceof DomainException && err.code === ErrorCodes.TIMELOG_OVERLAP) ||
          (err instanceof Error &&
            (/overlap/i.test(err.message) || /can't log time for two projects/i.test(err.message)))
        ) {
          skipped += 1;
          continue;
        }
        failed.push({
          row: row.rowNumber,
          reason:
            err instanceof DomainException
              ? err.message
              : err instanceof Error
                ? err.message
                : "Import failed"
        });
      }
    }

    return { created, skipped, failed };
  }

  /**
   * Same entry after export→re-import.
   * Export only writes HH:mm (seconds dropped), so we compare at minute precision — not fuzzy matching.
   * Also treats same-task overlaps as already present (defensive if overnight/TZ reconstruction drifts).
   */
  private async findExistingCoverage(userId: string, taskId: string, start: Date, end: Date) {
    const startMin = floorToUtcMinute(start);
    const endMin = floorToUtcMinute(end);
    const exact = await this.prisma.timeLog.findFirst({
      where: {
        userId,
        taskId,
        startTime: {
          gte: startMin,
          lt: new Date(startMin.getTime() + 60_000)
        },
        endTime: {
          gte: endMin,
          lt: new Date(endMin.getTime() + 60_000)
        }
      },
      select: { id: true }
    });
    if (exact) return exact;

    return this.prisma.timeLog.findFirst({
      where: {
        userId,
        taskId,
        startTime: { lt: end },
        endTime: { gt: start }
      },
      select: { id: true }
    });
  }
  private async resolveTimezone(
    workspaceId: string,
    userId: string,
    requested?: string
  ): Promise<string> {
    if (requested?.trim()) return requested.trim();
    const profile = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true }
    });
    const prefs = profile?.preferences;
    if (prefs && typeof prefs === "object" && prefs !== null && "timezone" in prefs) {
      const tz = (prefs as { timezone?: unknown }).timezone;
      if (typeof tz === "string" && tz.trim()) return tz.trim();
    }
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { settings: true }
    });
    return parseWorkspaceSettingsFromRaw(workspace?.settings).timezone || "UTC";
  }

  private async loadTaskCatalog(workspaceId: string, userId: string, role: string) {
    const projects = await this.prisma.project.findMany({
      where:
        role === "ADMIN"
          ? { workspaceId, isActive: true }
          : {
              workspaceId,
              isActive: true,
              team: { members: { some: { userId, isActive: true } } }
            },
      select: {
        id: true,
        name: true,
        tasks: {
          where: { isActive: true },
          select: { id: true, taskName: true, isCommon: true }
        }
      }
    });

    let assigneeTaskIds: Set<string> | null = null;
    if (role !== "ADMIN") {
      const assignees = await this.prisma.taskAssignee.findMany({
        where: { userId, task: { project: { workspaceId } } },
        select: { taskId: true }
      });
      assigneeTaskIds = new Set(assignees.map((a) => a.taskId));
    }

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      tasks: project.tasks.filter(
        (task) => role === "ADMIN" || task.isCommon || (assigneeTaskIds?.has(task.id) ?? false)
      )
    }));
  }

  private resolveTaskId(
    catalog: Array<{ id: string; name: string; tasks: Array<{ id: string; taskName: string }> }>,
    projectKey: string,
    taskKey: string
  ): string {
    const projects = UUID_RE.test(projectKey)
      ? catalog.filter((p) => p.id === projectKey)
      : catalog.filter((p) => p.name.toLowerCase() === projectKey.toLowerCase());

    if (projects.length === 0) {
      throw new Error(`Unknown project "${projectKey}"`);
    }
    if (projects.length > 1) {
      throw new Error(`Ambiguous project name "${projectKey}"`);
    }
    const project = projects[0]!;

    const tasks = UUID_RE.test(taskKey)
      ? project.tasks.filter((t) => t.id === taskKey)
      : project.tasks.filter((t) => t.taskName.toLowerCase() === taskKey.toLowerCase());

    if (tasks.length === 0) {
      throw new Error(`Unknown task "${taskKey}" in project "${project.name}"`);
    }
    if (tasks.length > 1) {
      throw new Error(`Ambiguous task name "${taskKey}" in project "${project.name}"`);
    }
    return tasks[0]!.id;
  }

  private async parseFile(buffer: Buffer, filename?: string): Promise<ParsedImportRow[]> {
    const lower = (filename ?? "").toLowerCase();
    if (lower.endsWith(".csv")) {
      return this.parseCsv(buffer.toString("utf8"));
    }
    return this.parseExcel(buffer);
  }

  private async parseExcel(buffer: Buffer): Promise<ParsedImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Excel file is empty",
        HttpStatus.BAD_REQUEST
      );
    }

    const { headerRowNumber, columns } = findHeaderRowInSheet(sheet);
    assertRequiredColumns(columns);
    return this.rowsFromSheet(sheet, columns, headerRowNumber);
  }

  private rowsFromSheet(
    sheet: ExcelJS.Worksheet,
    columns: ColumnMap,
    headerRowNumber: number
  ): ParsedImportRow[] {
    const rows: ParsedImportRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;
      const raw = {
        project: cellText(row.getCell((columns.project ?? 0) + 1)),
        task: cellText(row.getCell((columns.task ?? 0) + 1)),
        date: normalizeExcelDate(row.getCell((columns.date ?? 0) + 1)),
        start_time: normalizeExcelClock(row.getCell((columns.start_time ?? 0) + 1)),
        end_time: normalizeExcelClock(row.getCell((columns.end_time ?? 0) + 1)),
        description:
          columns.description !== undefined
            ? cellText(row.getCell(columns.description + 1)) || undefined
            : undefined,
        billable:
          columns.billable !== undefined
            ? cellText(row.getCell(columns.billable + 1)) || undefined
            : undefined
      };
      if (isSkippableImportRow(raw)) return;
      rows.push(toParsedRow(raw, rowNumber));
    });
    return rows;
  }

  private parseCsv(text: string): ParsedImportRow[] {
    const lines = text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];

    let headerLineIndex = -1;
    let columns: ColumnMap = {};
    for (let i = 0; i < Math.min(lines.length, 30); i += 1) {
      const mapped = mapHeaders(splitCsvLine(lines[i]!).map((h) => h.trim()));
      if (hasRequiredColumns(mapped)) {
        headerLineIndex = i;
        columns = mapped;
        break;
      }
    }
    if (headerLineIndex < 0) {
      throwMissingRequiredColumn(columns);
    }
    assertRequiredColumns(columns);

    const rows: ParsedImportRow[] = [];
    for (let i = headerLineIndex + 1; i < lines.length; i += 1) {
      const cols = splitCsvLine(lines[i]!);
      const raw = {
        project: cols[columns.project!]?.trim() ?? "",
        task: cols[columns.task!]?.trim() ?? "",
        date: cols[columns.date!]?.trim() ?? "",
        start_time: cols[columns.start_time!]?.trim() ?? "",
        end_time: cols[columns.end_time!]?.trim() ?? "",
        description:
          columns.description !== undefined
            ? cols[columns.description]?.trim() || undefined
            : undefined,
        billable:
          columns.billable !== undefined ? cols[columns.billable]?.trim() || undefined : undefined
      };
      if (isSkippableImportRow(raw)) continue;
      rows.push(toParsedRow(raw, i + 1));
    }
    return rows;
  }
}

export function canonicalizeImportHeader(raw: string): ImportColumn | null {
  const normalized = raw.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return HEADER_ALIASES[normalized] ?? null;
}

export function mapHeaders(headers: string[]): ColumnMap {
  const columns: ColumnMap = {};
  headers.forEach((header, index) => {
    const key = canonicalizeImportHeader(header);
    if (key && columns[key] === undefined) columns[key] = index;
  });
  return columns;
}

function hasRequiredColumns(columns: ColumnMap): boolean {
  return REQUIRED_IMPORT_COLUMNS.every((key) => columns[key] !== undefined);
}

function assertRequiredColumns(columns: ColumnMap): void {
  for (const required of REQUIRED_IMPORT_COLUMNS) {
    if (columns[required] === undefined) {
      throwMissingRequiredColumn(columns, required);
    }
  }
}

function throwMissingRequiredColumn(columns: ColumnMap, missing?: string): never {
  const required = missing ?? REQUIRED_IMPORT_COLUMNS.find((key) => columns[key] === undefined);
  throw new DomainException(
    ErrorCodes.VALIDATION_ERROR,
    `Missing required column "${required ?? "project"}"`,
    HttpStatus.BAD_REQUEST
  );
}

function findHeaderRowInSheet(sheet: ExcelJS.Worksheet): {
  headerRowNumber: number;
  columns: ColumnMap;
} {
  const maxScan = Math.min(sheet.rowCount || 1, 40);
  for (let rowNumber = 1; rowNumber <= maxScan; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const headers: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.text ?? "").trim();
    });
    const columns = mapHeaders(headers);
    if (hasRequiredColumns(columns)) {
      return { headerRowNumber: rowNumber, columns };
    }
  }
  throwMissingRequiredColumn({});
}

function isSkippableImportRow(raw: {
  project: string;
  task: string;
  date: string;
  start_time: string;
  end_time: string;
  description?: string;
}): boolean {
  if (!raw.project && !raw.task && !raw.date) return true;

  // Export total footer may put "Total" under Project (or Description).
  const markers = [raw.project, raw.task, raw.description ?? ""].map((s) => s.trim().toLowerCase());
  if (markers.includes("total")) {
    if (
      !raw.start_time ||
      !raw.end_time ||
      !raw.task ||
      raw.task.trim().toLowerCase() === "total"
    ) {
      return true;
    }
  }
  return false;
}

function cellText(cell: ExcelJS.Cell): string {
  return String(cell.text ?? "").trim();
}

function normalizeExcelDate(cell: ExcelJS.Cell): string {
  if (cell.value instanceof Date) {
    return cell.value.toISOString().slice(0, 10);
  }
  return cellText(cell);
}

function normalizeExcelClock(cell: ExcelJS.Cell): string {
  if (cell.value instanceof Date) {
    const h = String(cell.value.getUTCHours()).padStart(2, "0");
    const m = String(cell.value.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  if (typeof cell.value === "number") {
    const totalMinutes = Math.round(cell.value * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return cellText(cell);
}

function toParsedRow(
  raw: {
    project: string;
    task: string;
    date: string;
    start_time: string;
    end_time: string;
    description?: string;
    billable?: string;
  },
  rowNumber: number
): ParsedImportRow {
  const parsed = timelogImportRowSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      project: raw.project || "?",
      task: raw.task || "?",
      date: raw.date || "1970-01-01",
      start_time: raw.start_time || "00:00",
      end_time: raw.end_time || "00:01",
      rowNumber,
      invalidReason: parsed.error.issues[0]?.message ?? "Invalid row"
    };
  }
  return { ...parsed.data, rowNumber };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

function normalizeClock(value: string): string {
  const [h, m] = value.split(":").map(Number);
  return `${String(h ?? 0).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
}

function parseBillable(value: TimelogImportRowDto["billable"]): boolean {
  if (typeof value === "boolean") return value;
  const v = String(value).trim().toLowerCase();
  return v === "true" || v === "yes" || v === "1";
}

/** Convert local date+HH:mm in an IANA zone to a UTC Date (same approach as client calendar-utils). */
export function combineDayAndTimeInZone(dateKey: string, time: string, timezone: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y!, m! - 1, d!, h || 0, min || 0, 0));
  if (timezone === "UTC") return guess;
  const offsetMs = getTimezoneOffsetMs(guess, timezone);
  return new Date(guess.getTime() - offsetMs);
}

export function addOneCalendarDay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const next = new Date(Date.UTC(y!, m! - 1, d! + 1));
  return next.toISOString().slice(0, 10);
}

/** Export writes HH:mm only — compare identity at that precision. */
export function floorToUtcMinute(date: Date): Date {
  const ms = date.getTime();
  return new Date(ms - (ms % 60_000));
}

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    let hour = getVal("hour");
    if (hour === 24) hour = 0;
    const tzDateUtc = Date.UTC(
      getVal("year"),
      getVal("month") - 1,
      getVal("day"),
      hour,
      getVal("minute"),
      getVal("second")
    );
    return tzDateUtc - date.getTime();
  } catch {
    return 0;
  }
}
