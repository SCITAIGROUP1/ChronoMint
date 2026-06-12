import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrevoTimesheetReminderService } from "./brevo-timesheet-reminder.service";

describe("BrevoTimesheetReminderService", () => {
  let service: BrevoTimesheetReminderService;
  let mockPrisma: any;
  let redisClient: any;
  let mockDispatch: any;

  beforeEach(() => {
    redisClient = {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue("OK")
    };
    mockPrisma = {
      teamMember: { findMany: vi.fn().mockResolvedValue([]) },
      timesheetPeriod: { findUnique: vi.fn() }
    };
    mockDispatch = { maybeSendTimesheetReminder: vi.fn().mockResolvedValue(undefined) };
    service = new BrevoTimesheetReminderService(
      mockPrisma,
      { getClient: () => redisClient } as never,
      mockDispatch
    );
  });

  it("does nothing when no team memberships", async () => {
    await service.runReminders();
    expect(mockDispatch.maybeSendTimesheetReminder).not.toHaveBeenCalled();
  });

  it("skips when dedup key exists", async () => {
    redisClient.get.mockResolvedValue("1");
    mockPrisma.teamMember.findMany.mockResolvedValue([
      {
        userId: "u1",
        user: {
          id: "u1",
          email: "user@example.com",
          preferences: { notifications: { enabled: true, timesheetReminders: true } }
        },
        team: {
          project: {
            id: "p1",
            name: "Alpha",
            timesheetApprovalPeriod: "weekly",
            workspace: { id: "ws1", settings: {} }
          }
        }
      }
    ]);

    await service.runReminders();

    expect(mockDispatch.maybeSendTimesheetReminder).not.toHaveBeenCalled();
  });

  it("sends reminder for draft period when user opted in", async () => {
    mockPrisma.teamMember.findMany.mockResolvedValue([
      {
        userId: "u1",
        user: {
          id: "u1",
          email: "user@example.com",
          preferences: { notifications: { enabled: true, timesheetReminders: true } }
        },
        team: {
          project: {
            id: "p1",
            name: "Alpha",
            timesheetApprovalPeriod: "weekly",
            workspace: { id: "ws1", settings: {} }
          }
        }
      }
    ]);
    mockPrisma.timesheetPeriod.findUnique.mockResolvedValue(null);

    await service.runReminders();

    expect(mockDispatch.maybeSendTimesheetReminder).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ projectName: "Alpha" })
    );
    expect(redisClient.setex).toHaveBeenCalled();
  });
});
