import {
  ErrorCodes,
  TASK_IMPORT_COLUMN_LABELS,
  TASK_IMPORT_COLUMNS,
  TASK_IMPORT_MAX_ROWS,
  taskImportRowSchema,
  type ExportTasksQuery,
  type TaskImportResponseDto,
  type TaskImportRowDto,
  type TaskListItemDto
} from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import type { Response } from "express";
import { AuthorizationEnforcementService } from "../../../common/access/authorization-enforcement.service";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TasksService } from "./tasks.service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEMPLATE_DATA_ROWS = 500;

type ImportColumn = (typeof TASK_IMPORT_COLUMNS)[number];
type ParsedImportRow = TaskImportRowDto & { rowNumber: number; invalidReason?: string };
type ColumnMap = Partial<Record<ImportColumn, number>>;

const HEADER_ALIASES: Record<string, ImportColumn> = {
  project: "project",
  category: "category",
  task: "task",
  "task name": "task",
  billable: "billable",
  active: "active",
  ...Object.fromEntries(
    TASK_IMPORT_COLUMNS.map((key) => [
      TASK_IMPORT_COLUMN_LABELS[key]
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " "),
      key
    ])
  )
};

@Injectable()
export class TaskImportService {
  constructor(
    private prisma: PrismaService,
    private tasks: TasksService,
    private authorization: AuthorizationEnforcementService
  ) {}

  async generateTemplate(params: {
    workspaceId: string;
    userId: string;
    role: "ADMIN" | "MEMBER";
    managedProjectIds: string[];
    res: Response;
  }) {
    const { projects, categories } = await this.loadTemplateCatalog(params);
    const workbook = new ExcelJS.Workbook();
    const tasksSheet = workbook.addWorksheet("Tasks");
    const referenceSheet = workbook.addWorksheet("Reference");

    referenceSheet.columns = [
      { header: "Projects", key: "project", width: 36 },
      { header: "Categories", key: "category", width: 36 }
    ];
    referenceSheet.getRow(1).font = { bold: true };
    const maxRows = Math.max(projects.length, categories.length, 1);
    for (let i = 0; i < maxRows; i++) {
      referenceSheet.addRow({
        project: projects[i]?.name ?? "",
        category: categories[i]?.name ?? ""
      });
    }
    referenceSheet.getColumn(1).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1 && !projects[rowNumber - 2]) cell.value = null;
    });
    referenceSheet.getColumn(2).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1 && !categories[rowNumber - 2]) cell.value = null;
    });

    tasksSheet.columns = TASK_IMPORT_COLUMNS.map((key) => ({
      header: TASK_IMPORT_COLUMN_LABELS[key],
      key,
      width: key === "task" ? 32 : 22
    }));
    tasksSheet.getRow(1).font = { bold: true };

    const sampleProject = projects[0]?.name ?? "Example Project";
    const sampleCategory = categories[0]?.name ?? "Development";
    tasksSheet.addRow({
      project: sampleProject,
      category: sampleCategory,
      task: "Example Task",
      billable: "TRUE",
      active: "TRUE"
    });

    const projectRangeEnd = Math.max(projects.length + 1, 2);
    const categoryRangeEnd = Math.max(categories.length + 1, 2);
    for (let row = 2; row <= TEMPLATE_DATA_ROWS + 1; row++) {
      tasksSheet.getCell(`A${row}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`Reference!$A$2:$A$${projectRangeEnd}`],
        showErrorMessage: true,
        errorTitle: "Invalid project",
        error: "Select a project from the list."
      };
      tasksSheet.getCell(`B${row}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`Reference!$B$2:$B$${categoryRangeEnd}`],
        showErrorMessage: true,
        errorTitle: "Invalid category",
        error: "Select a category from the list."
      };
      for (const col of ["D", "E"] as const) {
        tasksSheet.getCell(`${col}${row}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"TRUE,FALSE"'],
          showErrorMessage: true,
          errorTitle: "Invalid value",
          error: "Use TRUE or FALSE."
        };
      }
    }

    await referenceSheet.protect("", {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      insertRows: false,
      deleteRows: false,
      insertColumns: false,
      deleteColumns: false
    });

    params.res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    params.res.setHeader("Content-Disposition", "attachment; filename=tasks_template.xlsx");
    await workbook.xlsx.write(params.res);
    params.res.end();
  }

  async importFile(params: {
    workspaceId: string;
    userId: string;
    role: "ADMIN" | "MEMBER";
    managedProjectIds: string[];
    buffer: Buffer;
    filename?: string;
  }): Promise<TaskImportResponseDto> {
    const rows = await this.parseFile(params.buffer, params.filename);
    if (rows.length === 0) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No valid task rows found in the file",
        HttpStatus.BAD_REQUEST
      );
    }
    if (rows.length > TASK_IMPORT_MAX_ROWS) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        `Maximum ${TASK_IMPORT_MAX_ROWS} rows allowed per import`,
        HttpStatus.BAD_REQUEST
      );
    }

    const catalog = await this.loadResolveCatalog(params.workspaceId);
    let created = 0;
    let skipped = 0;
    const failed: TaskImportResponseDto["failed"] = [];

    for (const row of rows) {
      try {
        if (row.invalidReason) {
          throw new Error(row.invalidReason);
        }
        const project = this.resolveProject(catalog.projects, row.project);
        if (!project.isActive) {
          throw new Error(`Project "${project.name}" is inactive`);
        }
        await this.authorization.assertAllowed({
          principalId: params.userId,
          permission: "project:ManageTasks",
          resource: {
            scope: "project",
            projectId: project.id,
            expectedWorkspaceId: params.workspaceId
          }
        });
        const category = this.resolveCategory(catalog.categories, row.category);
        if (!category.isActive) {
          throw new Error(`Cannot use inactive category "${category.name}"`);
        }

        const existing = await this.prisma.task.findFirst({
          where: {
            projectId: project.id,
            taskName: { equals: row.task, mode: "insensitive" }
          },
          select: { id: true }
        });
        if (existing) {
          skipped += 1;
          continue;
        }

        const createdTask = await this.tasks.create(
          params.workspaceId,
          params.userId,
          params.role,
          {
            projectId: project.id,
            categoryId: category.id,
            taskName: row.task,
            billableDefault: parseOptionalBoolean(row.billable) ?? true,
            isCommon: true,
            assigneeUserIds: []
          }
        );

        if (parseOptionalBoolean(row.active) === false) {
          await this.tasks.update(params.workspaceId, params.userId, params.role, createdTask.id, {
            isActive: false
          });
        }

        created += 1;
      } catch (err) {
        failed.push({
          row: row.rowNumber,
          reason: importFailureReason(err)
        });
      }
    }

    return { created, skipped, failed };
  }

  async exportCatalog(params: {
    workspaceId: string;
    userId: string;
    role: "ADMIN" | "MEMBER";
    managedProjectIds: string[];
    query: ExportTasksQuery;
    res: Response;
  }) {
    const list = await this.tasks.list(
      params.workspaceId,
      params.userId,
      params.role,
      {
        page: 1,
        limit: 1000,
        ...(params.query.projectId ? { projectId: params.query.projectId } : {}),
        ...(params.query.search ? { search: params.query.search } : {}),
        ...(params.query.isActive !== undefined ? { isActive: params.query.isActive } : {})
      },
      params.managedProjectIds
    );

    const projects = await this.prisma.project.findMany({
      where: { workspaceId: params.workspaceId },
      select: { id: true, name: true }
    });
    const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

    const rows = (list.items as TaskListItemDto[]).map((task) => ({
      project: projectNameById.get(task.projectId) ?? task.projectId,
      category: task.categoryName ?? "",
      task: task.taskName,
      billable: task.billableDefault ? "TRUE" : "FALSE",
      common: task.isCommon ? "TRUE" : "FALSE",
      active: task.isActive ? "TRUE" : "FALSE"
    }));

    if (params.query.format === "csv") {
      const header = ["Project", "Category", "Task", "Billable", "Common", "Active"];
      const lines = [
        header.join(","),
        ...rows.map((row) =>
          [row.project, row.category, row.task, row.billable, row.common, row.active]
            .map(csvEscape)
            .join(",")
        )
      ];
      params.res.setHeader("Content-Type", "text/csv; charset=utf-8");
      params.res.setHeader("Content-Disposition", "attachment; filename=tasks_export.csv");
      params.res.send(lines.join("\n"));
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Tasks");
    sheet.columns = [
      { header: "Project", key: "project", width: 28 },
      { header: "Category", key: "category", width: 24 },
      { header: "Task", key: "task", width: 32 },
      { header: "Billable", key: "billable", width: 12 },
      { header: "Common", key: "common", width: 12 },
      { header: "Active", key: "active", width: 12 }
    ];
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) sheet.addRow(row);

    params.res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    params.res.setHeader("Content-Disposition", "attachment; filename=tasks_export.xlsx");
    await workbook.xlsx.write(params.res);
    params.res.end();
  }

  private async loadTemplateCatalog(params: {
    workspaceId: string;
    userId: string;
    role: "ADMIN" | "MEMBER";
    managedProjectIds: string[];
  }) {
    const [allProjects, categories] = await Promise.all([
      this.prisma.project.findMany({
        where: { workspaceId: params.workspaceId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      }),
      this.prisma.category.findMany({
        where: { workspaceId: params.workspaceId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      })
    ]);

    const manageable: { id: string; name: string }[] = [];
    for (const project of allProjects) {
      if (
        params.role === "MEMBER" &&
        params.managedProjectIds.length > 0 &&
        !params.managedProjectIds.includes(project.id)
      ) {
        continue;
      }
      const decision = await this.authorization.evaluate({
        principalId: params.userId,
        permission: "project:ManageTasks",
        resource: {
          scope: "project",
          projectId: project.id,
          expectedWorkspaceId: params.workspaceId
        }
      });
      if (decision.allowed) manageable.push(project);
    }

    return { projects: manageable, categories };
  }

  private async loadResolveCatalog(workspaceId: string) {
    const [projects, categories] = await Promise.all([
      this.prisma.project.findMany({
        where: { workspaceId },
        select: { id: true, name: true, isActive: true }
      }),
      this.prisma.category.findMany({
        where: { workspaceId },
        select: { id: true, name: true, isActive: true }
      })
    ]);
    return { projects, categories };
  }

  private resolveProject(
    projects: Array<{ id: string; name: string; isActive: boolean }>,
    key: string
  ) {
    const matches = UUID_RE.test(key)
      ? projects.filter((p) => p.id === key)
      : projects.filter((p) => p.name.toLowerCase() === key.toLowerCase());
    if (matches.length === 0) {
      throw new Error(`Unknown project "${key}"`);
    }
    if (matches.length > 1) {
      throw new Error(`Ambiguous project name "${key}"`);
    }
    return matches[0]!;
  }

  private resolveCategory(
    categories: Array<{ id: string; name: string; isActive: boolean }>,
    key: string
  ) {
    const matches = UUID_RE.test(key)
      ? categories.filter((c) => c.id === key)
      : categories.filter((c) => c.name.toLowerCase() === key.toLowerCase());
    if (matches.length === 0) {
      throw new Error(`Unknown category "${key}"`);
    }
    if (matches.length > 1) {
      throw new Error(`Ambiguous category name "${key}"`);
    }
    return matches[0]!;
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
    const sheet =
      workbook.getWorksheet("Tasks") ??
      workbook.worksheets.find((s) => s.name.toLowerCase() !== "reference") ??
      workbook.worksheets[0];
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
        category: cellText(row.getCell((columns.category ?? 0) + 1)),
        task: cellText(row.getCell((columns.task ?? 0) + 1)),
        billable:
          columns.billable !== undefined
            ? cellText(row.getCell(columns.billable + 1)) || undefined
            : undefined,
        active:
          columns.active !== undefined
            ? cellText(row.getCell(columns.active + 1)) || undefined
            : undefined
      };
      if (!raw.project && !raw.category && !raw.task) return;
      rows.push(toParsedRow(raw, rowNumber));
    });
    return rows;
  }

  private parseCsv(text: string): ParsedImportRow[] {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];
    const headerCells = splitCsvLine(lines[0]!);
    const columns = mapHeaderColumns(headerCells);
    assertRequiredColumns(columns);
    const rows: ParsedImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = splitCsvLine(lines[i]!);
      const raw = {
        project: cells[columns.project ?? 0]?.trim() ?? "",
        category: cells[columns.category ?? 0]?.trim() ?? "",
        task: cells[columns.task ?? 0]?.trim() ?? "",
        billable:
          columns.billable !== undefined ? cells[columns.billable]?.trim() || undefined : undefined,
        active:
          columns.active !== undefined ? cells[columns.active]?.trim() || undefined : undefined
      };
      if (!raw.project && !raw.category && !raw.task) continue;
      rows.push(toParsedRow(raw, i + 1));
    }
    return rows;
  }
}

function toParsedRow(
  raw: {
    project: string;
    category: string;
    task: string;
    billable?: string;
    active?: string;
  },
  rowNumber: number
): ParsedImportRow {
  const parsed = taskImportRowSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      project: raw.project,
      category: raw.category,
      task: raw.task,
      rowNumber,
      invalidReason: parsed.error.issues[0]?.message ?? "Invalid row"
    };
  }
  return { ...parsed.data, rowNumber };
}

function findHeaderRowInSheet(sheet: ExcelJS.Worksheet): {
  headerRowNumber: number;
  columns: ColumnMap;
} {
  let headerRowNumber = 1;
  let columns: ColumnMap = {};
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 5) return;
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cells[colNumber - 1] = cellText(cell);
    });
    const mapped = mapHeaderColumns(cells);
    if (
      mapped.project !== undefined &&
      mapped.category !== undefined &&
      mapped.task !== undefined
    ) {
      headerRowNumber = rowNumber;
      columns = mapped;
    }
  });
  return { headerRowNumber, columns };
}

function mapHeaderColumns(cells: string[]): ColumnMap {
  const columns: ColumnMap = {};
  cells.forEach((cell, index) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)];
    if (key && columns[key] === undefined) columns[key] = index;
  });
  return columns;
}

function assertRequiredColumns(columns: ColumnMap) {
  for (const required of ["project", "category", "task"] as const) {
    if (columns[required] === undefined) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        `Missing required column: ${TASK_IMPORT_COLUMN_LABELS[required]}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object" && "text" in value && typeof value.text === "string") {
    return value.text.trim();
  }
  if (typeof value === "object" && "result" in value && value.result != null) {
    return String(value.result).trim();
  }
  return String(cell.text ?? "").trim();
}

function parseOptionalBoolean(value: boolean | string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "1"].includes(normalized)) return true;
  if (["false", "no", "0"].includes(normalized)) return false;
  return undefined;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
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
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function importFailureReason(err: unknown): string {
  if (err instanceof DomainException) {
    const response = err.getResponse();
    if (typeof response === "object" && response && "message" in response) {
      return String((response as { message: unknown }).message);
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Import failed";
}
