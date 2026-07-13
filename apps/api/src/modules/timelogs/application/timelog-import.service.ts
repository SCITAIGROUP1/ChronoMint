import {
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

type ParsedImportRow = TimelogImportRowDto & { rowNumber: number; invalidReason?: string };

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
      header: key,
      key,
      width: key === "description" ? 40 : 18
    }));
    sheet.addRow({
      project: "Example Project",
      task: "Example Task",
      date: "2026-07-01",
      start_time: "09:00",
      end_time: "10:30",
      description: "Optional notes",
      billable: "true"
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
    const failed: TimelogImportResponseDto["failed"] = [];

    for (const row of rows) {
      try {
        if (row.invalidReason) {
          throw new Error(row.invalidReason);
        }
        const taskId = this.resolveTaskId(catalog, row.project, row.task);
        const start = combineDayAndTimeInZone(row.date, normalizeClock(row.start_time), timezone);
        const end = combineDayAndTimeInZone(row.date, normalizeClock(row.end_time), timezone);
        if (end.getTime() <= start.getTime()) {
          throw new Error("end_time must be after start_time");
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

    return { created, failed };
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

    const headerRow = sheet.getRow(1);
    const headers = TIMELOG_IMPORT_COLUMNS.map((_, index) =>
      String(headerRow.getCell(index + 1).text ?? "")
        .trim()
        .toLowerCase()
    );
    for (const required of ["project", "task", "date", "start_time", "end_time"] as const) {
      if (!headers.includes(required)) {
        throw new DomainException(
          ErrorCodes.VALIDATION_ERROR,
          `Missing required column "${required}"`,
          HttpStatus.BAD_REQUEST
        );
      }
    }

    return this.rowsFromSheet(sheet, headers);
  }

  private rowsFromSheet(sheet: ExcelJS.Worksheet, headers: string[]): ParsedImportRow[] {
    const colIndex = (name: string) => headers.indexOf(name);
    const rows: ParsedImportRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const raw = {
        project: cellText(row.getCell(colIndex("project") + 1)),
        task: cellText(row.getCell(colIndex("task") + 1)),
        date: normalizeExcelDate(row.getCell(colIndex("date") + 1)),
        start_time: normalizeExcelClock(row.getCell(colIndex("start_time") + 1)),
        end_time: normalizeExcelClock(row.getCell(colIndex("end_time") + 1)),
        description: cellText(row.getCell(colIndex("description") + 1)) || undefined,
        billable: cellText(row.getCell(colIndex("billable") + 1)) || undefined
      };
      if (!raw.project && !raw.task && !raw.date) return;
      rows.push(toParsedRow(raw, rowNumber));
    });
    return rows;
  }

  private parseCsv(text: string): ParsedImportRow[] {
    const lines = text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];
    const headers = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
    for (const required of ["project", "task", "date", "start_time", "end_time"] as const) {
      if (!headers.includes(required)) {
        throw new DomainException(
          ErrorCodes.VALIDATION_ERROR,
          `Missing required column "${required}"`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
    const idx = (name: string) => headers.indexOf(name);
    const rows: ParsedImportRow[] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const cols = splitCsvLine(lines[i]!);
      const raw = {
        project: cols[idx("project")]?.trim() ?? "",
        task: cols[idx("task")]?.trim() ?? "",
        date: cols[idx("date")]?.trim() ?? "",
        start_time: cols[idx("start_time")]?.trim() ?? "",
        end_time: cols[idx("end_time")]?.trim() ?? "",
        description: cols[idx("description")]?.trim() || undefined,
        billable: cols[idx("billable")]?.trim() || undefined
      };
      if (!raw.project && !raw.task && !raw.date) continue;
      rows.push(toParsedRow(raw, i + 1));
    }
    return rows;
  }
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
