import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrevoNotificationService } from "./brevo-notification.service";

describe("BrevoNotificationService", () => {
  let service: BrevoNotificationService;
  let mailer: { send: ReturnType<typeof vi.fn>; isConfigured: boolean };

  beforeEach(() => {
    mailer = { send: vi.fn().mockResolvedValue(undefined), isConfigured: true };
    service = new BrevoNotificationService(mailer as never);
    process.env.FRONTEND_ORIGIN = "http://localhost:3000";
  });

  it("sendProjectTeamInvite sends invite email", async () => {
    const sent = await service.sendProjectTeamInvite({
      to: "user@example.com",
      inviteUrl: "http://localhost:3000/invite/abc",
      projectName: "Alpha",
      workspaceName: "Acme",
      expiresAt: new Date("2026-06-20").toISOString()
    });

    expect(sent).toBe(true);
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["user@example.com"],
        subject: expect.stringContaining("Alpha")
      })
    );
  });

  it("sendProjectTeamInvite returns false when mailer unconfigured", async () => {
    mailer.isConfigured = false;
    const sent = await service.sendProjectTeamInvite({
      to: "user@example.com",
      inviteUrl: "http://localhost:3000/invite/abc",
      projectName: "Alpha",
      workspaceName: "Acme",
      expiresAt: new Date().toISOString()
    });
    expect(sent).toBe(false);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("sendWorkspaceMemberAdded sends workspace email", async () => {
    await service.sendWorkspaceMemberAdded({
      to: "user@example.com",
      workspaceName: "Acme",
      role: "MEMBER"
    });

    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["user@example.com"],
        subject: expect.stringContaining("Acme")
      })
    );
  });

  it("sendScheduledExport attaches export file", async () => {
    const buffer = Buffer.from("data");
    await service.sendScheduledExport({
      to: ["admin@example.com"],
      scheduleName: "Weekly",
      filename: "report.csv",
      buffer,
      contentType: "text/csv"
    });

    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [expect.objectContaining({ filename: "report.csv", content: buffer })]
      })
    );
  });
});
