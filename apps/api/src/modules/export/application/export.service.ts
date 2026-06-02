import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import archiver from "archiver";
import { PassThrough } from "stream";
import {
  buildExportFilename,
  EXPORT_COLUMN_LABELS,
  MEMBER_EXPORT_COLUMN_LABELS,
  resolveExportColumns,
  resolveMemberExportColumns,
  type ExportBodyDto,
  type ExportReportType,
  type MemberExportBodyDto,
  type MemberExportReportType
} from "@chronomint/contracts";
import { PrismaService } from "../../../common/prisma/prisma.service";
import {
  roundExport,
  TimeAggregationService,
  type TimeLogWithRelations
} from "../../reporting/application/time-aggregation.service";
import { projectRows, rowsToCsv } from "./export-render.util";

type SheetData = {
  name: string;
  report: ExportReportType | MemberExportReportType;
  reportSlug: string;
  headers: string[];
  lines: string[][];
};

type ExportScope = "admin" | "member";

@Injectable()
export class ExportService {
  constructor(
    private prisma: PrismaService,
    private aggregation: TimeAggregationService
  ) {}

  async generate(
    workspaceId: string,
    body: ExportBodyDto
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    return this.runExport(workspaceId, body, "admin");
  }

  async generateMember(
    workspaceId: string,
    userId: string,
    body: MemberExportBodyDto
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    return this.runExport(
      workspaceId,
      {
        from: body.from,
        to: body.to,
        projectId: body.projectId,
        userId,
        billable: body.billable,
        reportTypes: body.reportTypes as ExportReportType[],
        format: body.format,
        columns: body.columns as ExportBodyDto["columns"]
      },
      "member",
      body
    );
  }

  /** Backward-compatible GET export */
  async generateLegacy(
    workspaceId: string,
    query: { from: string; to: string; projectId?: string; userId?: string; format: "csv" | "pdf" | "xlsx" }
  ) {
    return this.generate(workspaceId, {
      from: query.from,
      to: query.to,
      projectId: query.projectId,
      userId: query.userId,
      billable: "all",
      reportTypes: ["time_entries"],
      format: query.format === "pdf" ? "pdf" : query.format === "xlsx" ? "xlsx" : "csv"
    });
  }

  private async runExport(
    workspaceId: string,
    body: ExportBodyDto,
    scope: ExportScope,
    memberBody?: MemberExportBodyDto
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId }
    });

    const from = new Date(body.from);
    const to = new Date(body.to);

    let userIds: string[] | undefined;
    if (body.teamOnly && body.projectId) {
      userIds = await this.aggregation.teamMemberUserIds(body.projectId);
    }

    const logs = await this.aggregation.fetchLogs(workspaceId, {
      from,
      to,
      projectId: body.projectId,
      userId: body.userId,
      userIds,
      billable: body.billable
    });

    const { resolveRate } = await this.aggregation.resolveRateMaps(workspaceId);
    const aggregates = this.aggregation.buildAggregates(logs, resolveRate);

    const isMember = scope === "member";
    const sheets: SheetData[] = [];

    for (const report of body.reportTypes) {
      const columnKeys = isMember
        ? resolveMemberExportColumns(
            report as MemberExportReportType,
            memberBody?.columns
          )
        : resolveExportColumns(report, body.columns);

      const labels = isMember
        ? MEMBER_EXPORT_COLUMN_LABELS[report as MemberExportReportType]
        : EXPORT_COLUMN_LABELS[report];

      const rows = isMember
        ? this.buildMemberRows(
            report as MemberExportReportType,
            logs,
            aggregates,
            resolveRate
          )
        : this.buildRows(report, logs, workspace.name, aggregates, resolveRate);

      const { headers, lines } = projectRows(rows, columnKeys, labels);
      sheets.push({
        name: this.sheetName(report),
        report,
        reportSlug: this.fileSlug(report),
        headers,
        lines
      });
    }

    const fileBase = {
      workspaceSlug: workspace.slug,
      from: body.from,
      to: body.to,
      scope
    } as const;

    if (body.format === "csv") {
      return this.renderCsv(sheets, fileBase);
    }
    if (body.format === "xlsx") {
      return this.renderXlsx(sheets, fileBase);
    }
    return this.renderPdf(sheets, fileBase, body, workspace.name);
  }

  private buildRows(
    report: ExportReportType,
    logs: TimeLogWithRelations[],
    workspaceName: string,
    aggregates: ReturnType<TimeAggregationService["buildAggregates"]>,
    resolveRate: (userId: string, projectId: string, defaultRate: number | null) => number
  ): Record<string, string | number>[] {
    if (report === "time_entries") {
      return logs.map((l) => {
        const hours = roundExport(l.durationSec / 3600);
        const rate = roundExport(
          resolveRate(
            l.userId,
            l.task.projectId,
            l.user.defaultHourlyRate?.toNumber() ?? null
          )
        );
        const amount = l.isBillable ? roundExport(hours * rate) : 0;
        return {
          workspace: workspaceName,
          client: l.task.project.clientName ?? "",
          project: l.task.project.name,
          task: l.task.taskName,
          member: l.user.name,
          email: l.user.email,
          date: l.startTime.toISOString().slice(0, 10),
          start_time: l.startTime.toISOString(),
          end_time: l.endTime.toISOString(),
          hours,
          billable: l.isBillable ? "yes" : "no",
          rate,
          amount,
          description: l.description ?? "",
          source: l.source
        };
      });
    }

    if (report === "daily_summary") {
      const rows: Record<string, string | number>[] = [];
      for (const [date, dayMap] of aggregates.daily) {
        for (const [, v] of dayMap) {
          rows.push({
            date,
            member: v.userName,
            email: v.userEmail,
            client: v.clientName ?? "",
            project: v.projectName,
            total_hours: roundExport(v.totalHours),
            billable_hours: roundExport(v.billableHours),
            non_billable_hours: roundExport(v.totalHours - v.billableHours),
            billable_amount: roundExport(v.billableAmount)
          });
        }
      }
      return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }

    if (report === "by_project") {
      return [...aggregates.byProject.entries()]
        .map(([, v]) => ({
          project: v.projectName,
          client: v.clientName ?? "",
          total_hours: roundExport(v.totalHours),
          billable_hours: roundExport(v.billableHours),
          non_billable_hours: roundExport(v.totalHours - v.billableHours),
          billable_amount: roundExport(v.billableAmount),
          active_members: v.members.size
        }))
        .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
    }

    return [...aggregates.byUser.entries()]
      .map(([, v]) => ({
        member: v.userName,
        email: v.userEmail,
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours),
        billable_amount: roundExport(v.billableAmount)
      }))
      .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
  }

  private buildMemberRows(
    report: MemberExportReportType,
    logs: TimeLogWithRelations[],
    aggregates: ReturnType<TimeAggregationService["buildAggregates"]>,
    resolveRate: (userId: string, projectId: string, defaultRate: number | null) => number
  ): Record<string, string | number>[] {
    if (report === "time_entries") {
      return logs.map((l) => {
        const hours = roundExport(l.durationSec / 3600);
        const rate = roundExport(
          resolveRate(
            l.userId,
            l.task.projectId,
            l.user.defaultHourlyRate?.toNumber() ?? null
          )
        );
        const amount = l.isBillable ? roundExport(hours * rate) : 0;
        return {
          project: l.task.project.name,
          task: l.task.taskName,
          date: l.startTime.toISOString().slice(0, 10),
          start_time: l.startTime.toISOString(),
          end_time: l.endTime.toISOString(),
          hours,
          billable: l.isBillable ? "yes" : "no",
          rate,
          amount,
          description: l.description ?? "",
          source: l.source
        };
      });
    }

    if (report === "daily_summary") {
      const rows: Record<string, string | number>[] = [];
      for (const [date, dayMap] of aggregates.daily) {
        for (const [, v] of dayMap) {
          rows.push({
            date,
            project: v.projectName,
            total_hours: roundExport(v.totalHours),
            billable_hours: roundExport(v.billableHours),
            non_billable_hours: roundExport(v.totalHours - v.billableHours)
          });
        }
      }
      return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }

    return [...aggregates.byProject.entries()]
      .map(([, v]) => ({
        project: v.projectName,
        total_hours: roundExport(v.totalHours),
        billable_hours: roundExport(v.billableHours),
        non_billable_hours: roundExport(v.totalHours - v.billableHours)
      }))
      .sort((a, b) => Number(b.total_hours) - Number(a.total_hours));
  }

  private sheetName(report: ExportReportType | MemberExportReportType): string {
    const names: Record<string, string> = {
      time_entries: "Time entries",
      daily_summary: "Daily summary",
      by_project: "By project",
      by_member: "By member"
    };
    return (names[report] ?? report).slice(0, 31);
  }

  private fileSlug(report: ExportReportType | MemberExportReportType): string {
    const slugs: Record<string, string> = {
      time_entries: "time-entries",
      daily_summary: "daily-summary",
      by_project: "by-project",
      by_member: "by-member"
    };
    return slugs[report] ?? "report";
  }

  private async renderCsv(
    sheets: SheetData[],
    fileBase: { workspaceSlug: string; from: string; to: string; scope: ExportScope }
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    if (sheets.length === 1) {
      const s = sheets[0]!;
      const csv = rowsToCsv(s.headers, s.lines);
      return {
        buffer: Buffer.from(csv, "utf-8"),
        contentType: "text/csv",
        filename: buildExportFilename({
          ...fileBase,
          reportSlug: s.reportSlug,
          ext: "csv"
        })
      };
    }

    const buffer = await this.zipCsvFiles(sheets, fileBase);
    return {
      buffer,
      contentType: "application/zip",
      filename: buildExportFilename({ ...fileBase, ext: "zip" })
    };
  }

  private zipCsvFiles(
    sheets: SheetData[],
    fileBase: { workspaceSlug: string; from: string; to: string; scope: ExportScope }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver("zip", { zlib: { level: 9 } });
      const stream = new PassThrough();
      const chunks: Buffer[] = [];
      stream.on("data", (c) => chunks.push(c as Buffer));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
      archive.on("error", reject);
      archive.pipe(stream);

      for (const s of sheets) {
        const csv = rowsToCsv(s.headers, s.lines);
        const name = buildExportFilename({
          ...fileBase,
          reportSlug: s.reportSlug,
          ext: "csv"
        });
        archive.append(csv, { name });
      }
      archive.finalize();
    });
  }

  private async renderXlsx(
    sheets: SheetData[],
    fileBase: { workspaceSlug: string; from: string; to: string; scope: ExportScope }
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    for (const s of sheets) {
      const ws = workbook.addWorksheet(s.name);
      ws.addRow(s.headers);
      for (const line of s.lines) {
        ws.addRow(line);
      }
      ws.getRow(1).font = { bold: true };
    }
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      buffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename: buildExportFilename({ ...fileBase, ext: "xlsx" })
    };
  }

  private async renderPdf(
    sheets: SheetData[],
    fileBase: { workspaceSlug: string; from: string; to: string; scope: ExportScope },
    body: ExportBodyDto,
    workspaceName: string
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));

    const title =
      fileBase.scope === "member" ? "ChronoMint — My timesheet" : "ChronoMint Export";
    doc.fontSize(18).text(title, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(11).text(workspaceName, { align: "center" });
    doc.fontSize(10).text(`Period: ${body.from.slice(0, 10)} — ${body.to.slice(0, 10)}`);
    doc.text(`Billable filter: ${body.billable}`);
    doc.moveDown();

    for (const s of sheets) {
      doc.fontSize(14).text(s.name);
      doc.moveDown(0.3);
      doc.fontSize(8);

      const maxRows = s.report === "time_entries" ? 500 : 200;
      const slice = s.lines.slice(0, maxRows);
      for (const line of slice) {
        doc.text(line.join(" | "));
      }
      if (s.lines.length > maxRows) {
        doc.moveDown(0.3);
        doc.text(`… ${s.lines.length - maxRows} more rows (use Excel/CSV for full export)`);
      }
      doc.moveDown();
    }

    doc.end();
    await new Promise<void>((resolve) => doc.on("end", resolve));

    return {
      buffer: Buffer.concat(chunks),
      contentType: "application/pdf",
      filename: buildExportFilename({ ...fileBase, ext: "pdf" })
    };
  }
}
