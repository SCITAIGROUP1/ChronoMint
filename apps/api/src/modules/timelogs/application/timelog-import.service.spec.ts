import { describe, expect, it, vi, beforeEach } from "vitest";
import { DomainException } from "../../../common/errors/domain.exception";
import { combineDayAndTimeInZone, TimelogImportService } from "./timelog-import.service";

describe("combineDayAndTimeInZone", () => {
  it("keeps UTC wall times as UTC", () => {
    const d = combineDayAndTimeInZone("2026-07-01", "09:30", "UTC");
    expect(d.toISOString()).toBe("2026-07-01T09:30:00.000Z");
  });
});

describe("TimelogImportService", () => {
  let service: TimelogImportService;
  let createMock: ReturnType<typeof vi.fn>;
  let mockPrisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    workspace: { findUnique: ReturnType<typeof vi.fn> };
    project: { findMany: ReturnType<typeof vi.fn> };
    taskAssignee: { findMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    createMock = vi.fn().mockResolvedValue({ id: "log-1" });
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
      taskAssignee: { findMany: vi.fn().mockResolvedValue([]) }
    };
    service = new TimelogImportService(
      mockPrisma as never,
      {
        create: createMock
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

  it("surfaces create overlap failures per row", async () => {
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
    expect(result.failed[0]?.reason).toMatch(/can't log time/i);
  });
});
