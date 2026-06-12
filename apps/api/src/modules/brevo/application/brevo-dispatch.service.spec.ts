import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrevoDispatchService } from "./brevo-dispatch.service";

describe("BrevoDispatchService", () => {
  let service: BrevoDispatchService;
  let mockPrisma: any;
  let mockNotifications: any;

  beforeEach(() => {
    mockPrisma = {
      user: { findUnique: vi.fn() }
    };
    mockNotifications = {
      sendProjectAssignment: vi.fn().mockResolvedValue(undefined),
      sendTimesheetReminder: vi.fn().mockResolvedValue(undefined),
      sendIdleTimerAlert: vi.fn().mockResolvedValue(undefined)
    };
    service = new BrevoDispatchService(mockPrisma, mockNotifications);
  });

  it("maybeSendProjectAssignment skips when notifications disabled", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "user@example.com",
      preferences: { notifications: { enabled: false, projectAssignment: true } }
    });

    await service.maybeSendProjectAssignment("u1", {
      projectName: "Alpha",
      workspaceName: "Acme"
    });

    expect(mockNotifications.sendProjectAssignment).not.toHaveBeenCalled();
  });

  it("maybeSendProjectAssignment sends when pref enabled", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "user@example.com",
      preferences: { notifications: { enabled: true, projectAssignment: true } }
    });

    await service.maybeSendProjectAssignment("u1", {
      projectName: "Alpha",
      workspaceName: "Acme"
    });

    expect(mockNotifications.sendProjectAssignment).toHaveBeenCalledWith({
      to: "user@example.com",
      projectName: "Alpha",
      workspaceName: "Acme"
    });
  });

  it("maybeSendIdleTimerAlert skips when idleTimerAlert is off", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      email: "user@example.com",
      preferences: { notifications: { enabled: true, idleTimerAlert: false } }
    });

    await service.maybeSendIdleTimerAlert("u1", { taskName: "Task", durationHours: 2 });

    expect(mockNotifications.sendIdleTimerAlert).not.toHaveBeenCalled();
  });
});
