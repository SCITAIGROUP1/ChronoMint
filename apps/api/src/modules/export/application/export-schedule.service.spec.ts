import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExportScheduleService } from "./export-schedule.service";

describe("ExportScheduleService", () => {
  let service: ExportScheduleService;
  let mockPrisma: any;
  let mockExport: any;
  let mockBrevo: any;

  beforeEach(() => {
    mockPrisma = {
      exportSchedule: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn()
      }
    };
    mockExport = {
      generate: vi.fn().mockResolvedValue({
        filename: "report.csv",
        buffer: Buffer.from("csv")
      })
    };
    mockBrevo = {
      sendScheduledExport: vi.fn().mockResolvedValue(undefined)
    };
    service = new ExportScheduleService(mockPrisma, mockExport, mockBrevo);
  });

  it("runSchedule sends export via Brevo when schedule is due", async () => {
    const schedule = {
      id: "sched-1",
      workspaceId: "ws-1",
      name: "Weekly",
      frequency: "weekly",
      recipientEmails: ["admin@example.com"],
      body: {
        from: "2026-06-01T00:00:00.000Z",
        to: "2026-06-07T23:59:59.999Z",
        reportTypes: ["time_entries"],
        format: "csv"
      },
      enabled: true
    };

    mockPrisma.exportSchedule.findUnique.mockResolvedValue(schedule);
    mockPrisma.exportSchedule.update.mockResolvedValue(schedule);

    await (service as any).runSchedule("sched-1");

    expect(mockBrevo.sendScheduledExport).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        scheduleName: "Weekly",
        filename: "report.csv"
      })
    );
    expect(mockPrisma.exportSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastRunStatus: "ok" })
      })
    );
  });
});
