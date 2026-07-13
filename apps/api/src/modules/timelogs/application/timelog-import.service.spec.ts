import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus } from "@nestjs/common";
import ExcelJS from "exceljs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import {
  canonicalizeImportHeader,
  combineDayAndTimeInZone,
  TimelogImportService
} from "./timelog-import.service";

describe("combineDayAndTimeInZone", () => {
  it("keeps UTC wall times as UTC", () => {
    const d = combineDayAndTimeInZone("2026-07-01", "09:30", "UTC");
    expect(d.toISOString()).toBe("2026-07-01T09:30:00.000Z");
  });
});

describe("canonicalizeImportHeader", () => {
  it("maps export labels and snake_case to import keys", () => {
    expect(canonicalizeImportHeader("Project")).toBe("project");
    expect(canonicalizeImportHeader("Start")).toBe("start_time");
    expect(canonicalizeImportHeader("start_time")).toBe("start_time");
    expect(canonicalizeImportHeader("End")).toBe("end_time");
    expect(canonicalizeImportHeader("Category")).toBeNull();
  });

  it("ignores extra export-only columns (kept in export, unused on import)", () => {
    expect(canonicalizeImportHeader("Category")).toBeNull();
    expect(canonicalizeImportHeader("Hours")).toBeNull();
    expect(canonicalizeImportHeader("Source")).toBeNull();
    expect(canonicalizeImportHeader("Rate")).toBeNull();
    expect(canonicalizeImportHeader("Amount")).toBeNull();
  });
});

describe("TimelogImportService", () => {
  let service: TimelogImportService;
  let createMock: ReturnType<typeof vi.fn>;
  let findFirstMock: ReturnType<typeof vi.fn>;
  let mockPrisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    workspace: { findUnique: ReturnType<typeof vi.fn> };
    project: { findMany: ReturnType<typeof vi.fn> };
    taskAssignee: { findMany: ReturnType<typeof vi.fn> };
    timeLog: { findFirst: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    createMock = vi.fn().mockResolvedValue({ id: "log-1" });
    findFirstMock = vi.fn().mockResolvedValue(null);
    mockPrisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ preferences: { timezone: "UTC" } }) },
      workspace: { findUnique: vi.fn().mockResolvedValue({ settings: {} }) },
      project: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "proj-1",
            name: "Acme",
            tasks: [{ id: "task-1", taskName: "Build", isCommon: true }]
          }
        ])
      },
      taskAssignee: { findMany: vi.fn().mockResolvedValue([]) },
      timeLog: { findFirst: findFirstMock }
    };
    service = new TimelogImportService(
      mockPrisma as never,
      {
        create: createMock,
        localTimeToUtc: (date: string, time: string, tz: string) =>
          combineDayAndTimeInZone(date, time, tz)
      } as never
    );
  });

  it("imports valid CSV rows", async () => {
    const csv = [
      "project,task,date,start_time,end_time,description,billable",
      "Acme,Build,2026-07-01,09:00,10:00,Hello,true"
    ].join("\n");

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer: Buffer.from(csv),
      filename: "entries.csv",
      timezone: "UTC"
    });

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.failed).toEqual([]);
    expect(createMock).toHaveBeenCalledWith(
      "ws-1",
      "u-1",
      "MEMBER",
      expect.objectContaining({
        taskId: "task-1",
        startTime: "2026-07-01T09:00:00.000Z",
        endTime: "2026-07-01T10:00:00.000Z",
        description: "Hello",
        isBillable: true
      })
    );
  });

  it("imports the official template Excel (human headers on row 1)", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Time entries");
    sheet.columns = [
      { header: "Project", key: "project", width: 18 },
      { header: "Task", key: "task", width: 18 },
      { header: "Date", key: "date", width: 18 },
      { header: "Start", key: "start_time", width: 18 },
      { header: "End", key: "end_time", width: 18 },
      { header: "Description", key: "description", width: 40 },
      { header: "Billable", key: "billable", width: 18 }
    ];
    sheet.addRow({
      project: "Acme",
      task: "Build",
      date: "2026-07-01",
      start_time: "09:00",
      end_time: "10:30",
      description: "From template",
      billable: "yes"
    });
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer,
      filename: "timelog_import_template.xlsx",
      timezone: "UTC"
    });

    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.failed).toEqual([]);
    expect(createMock).toHaveBeenCalledWith(
      "ws-1",
      "u-1",
      "MEMBER",
      expect.objectContaining({
        taskId: "task-1",
        startTime: "2026-07-01T09:00:00.000Z",
        endTime: "2026-07-01T10:30:00.000Z",
        description: "From template",
        isBillable: true
      })
    );
  });

  it("imports template-style CSV with human headers", async () => {
    const csv = [
      "Project,Task,Date,Start,End,Description,Billable",
      "Acme,Build,2026-07-01,11:00,12:00,Notes,yes"
    ].join("\n");

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer: Buffer.from(csv),
      filename: "template.csv",
      timezone: "UTC"
    });

    expect(result.created).toBe(1);
    expect(result.failed).toEqual([]);
  });

  it("skips export Total footer when label is under Project", async () => {
    const csv = [
      "Project,Category,Task,Date,Start,End,Hours,Billable,Description,Source",
      "Acme,Dev,Build,2026-07-01,09:00,10:00,1.00,yes,Hello,manual",
      "Total,,,,,,1.00,,,"
    ].join("\n");

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer: Buffer.from(csv),
      filename: "export.csv",
      timezone: "UTC"
    });

    expect(result.created).toBe(1);
    expect(result.failed).toEqual([]);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("imports export-style CSV with title rows and human headers", async () => {
    const csv = [
      "Time entries",
      "Acme Workspace - member export",
      "Project,Category,Task,Date,Start,End,Hours,Billable,Description,Source",
      "Acme,Dev,Build,2026-07-01,09:00,10:00,1.00,yes,Hello,manual",
      ",,,,,,1.00,,Total,"
    ].join("\n");

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer: Buffer.from(csv),
      filename: "export.csv",
      timezone: "UTC"
    });

    expect(result.created).toBe(1);
    expect(result.failed).toEqual([]);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("imports export-style Excel with title block and Total row", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Time entries");
    sheet.addRow(["Time entries"]);
    sheet.addRow(["Acme Workspace - member export"]);
    sheet.addRow([
      "Project",
      "Category",
      "Task",
      "Date",
      "Start",
      "End",
      "Hours",
      "Billable",
      "Description",
      "Source"
    ]);
    sheet.addRow([
      "Acme",
      "Dev",
      "Build",
      "2026-07-01",
      "09:00",
      "10:00",
      1,
      "yes",
      "Hello",
      "manual"
    ]);
    sheet.addRow(["", "", "", "", "", "", 1, "", "Total", ""]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer,
      filename: "export.xlsx",
      timezone: "UTC"
    });

    expect(result.created).toBe(1);
    expect(result.failed).toEqual([]);
  });

  it("skips rows that already exist instead of recreating them", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "existing-1" });
    const csv = ["project,task,date,start_time,end_time", "Acme,Build,2026-07-01,09:00,10:00"].join(
      "\n"
    );

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer: Buffer.from(csv),
      filename: "entries.csv",
      timezone: "UTC"
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.failed).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("skips same-task overlaps as already covered (re-import)", async () => {
    // First lookup (exact) miss, second (overlap) hit.
    findFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "overlap-1" });
    const csv = ["project,task,date,start_time,end_time", "Acme,Build,2026-07-01,09:30,10:30"].join(
      "\n"
    );

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer: Buffer.from(csv),
      filename: "entries.csv",
      timezone: "UTC"
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.failed).toEqual([]);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("treats create-time overlap conflicts as skipped, not failed", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockRejectedValueOnce(
      new DomainException(
        ErrorCodes.TIMELOG_OVERLAP,
        'You can\'t log time for two projects at once. This overlaps "Acme · Build".',
        HttpStatus.CONFLICT
      )
    );
    const csv = ["project,task,date,start_time,end_time", "Acme,Build,2026-07-01,09:00,10:00"].join(
      "\n"
    );

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer: Buffer.from(csv),
      filename: "entries.csv",
      timezone: "UTC"
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.failed).toEqual([]);
  });

  it("rolls overnight end times to the next calendar day", async () => {
    const csv = ["project,task,date,start_time,end_time", "Acme,Build,2026-07-01,23:00,03:30"].join(
      "\n"
    );

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer: Buffer.from(csv),
      filename: "entries.csv",
      timezone: "UTC"
    });

    expect(result.created).toBe(1);
    expect(result.failed).toEqual([]);
    expect(createMock).toHaveBeenCalledWith(
      "ws-1",
      "u-1",
      "MEMBER",
      expect.objectContaining({
        startTime: "2026-07-01T23:00:00.000Z",
        endTime: "2026-07-02T03:30:00.000Z"
      })
    );
  });

  it("collects unknown task as a failed row without aborting", async () => {
    const csv = [
      "project,task,date,start_time,end_time",
      "Acme,Missing,2026-07-01,09:00,10:00",
      "Acme,Build,2026-07-01,11:00,12:00"
    ].join("\n");

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer: Buffer.from(csv),
      filename: "entries.csv",
      timezone: "UTC"
    });

    expect(result.created).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.row).toBe(2);
    expect(result.failed[0]?.reason).toMatch(/Unknown task/i);
  });

  it("rejects empty files", async () => {
    await expect(
      service.importFile({
        workspaceId: "ws-1",
        userId: "u-1",
        role: "MEMBER",
        buffer: Buffer.from("project,task,date,start_time,end_time\n"),
        filename: "empty.csv"
      })
    ).rejects.toBeInstanceOf(DomainException);
  });

  it("treats plain overlap errors as skipped when re-importing", async () => {
    createMock.mockRejectedValueOnce(new Error("You can't log time for two projects at once."));
    const csv = ["project,task,date,start_time,end_time", "Acme,Build,2026-07-01,09:00,10:00"].join(
      "\n"
    );

    const result = await service.importFile({
      workspaceId: "ws-1",
      userId: "u-1",
      role: "MEMBER",
      buffer: Buffer.from(csv),
      filename: "entries.csv",
      timezone: "UTC"
    });

    expect(result.created).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.failed).toEqual([]);
  });
});
