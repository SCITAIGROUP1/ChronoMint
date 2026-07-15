import { describe, expect, it, vi, beforeEach } from "vitest";
import { MailWorker } from "./mail.worker";

describe("MailWorker", () => {
  let memberMailer: {
    sendNewMemberCredentials: ReturnType<typeof vi.fn>;
    sendWorkspaceAdded: ReturnType<typeof vi.fn>;
    sendProjectInviteWelcome: ReturnType<typeof vi.fn>;
    sendProjectInviteExisting: ReturnType<typeof vi.fn>;
  };
  let worker: MailWorker;

  beforeEach(() => {
    memberMailer = {
      sendNewMemberCredentials: vi.fn().mockResolvedValue({ sent: true }),
      sendWorkspaceAdded: vi.fn().mockResolvedValue({ sent: true }),
      sendProjectInviteWelcome: vi.fn().mockResolvedValue({ sent: true }),
      sendProjectInviteExisting: vi.fn().mockResolvedValue({ sent: true })
    };
    worker = new MailWorker(memberMailer as never);
  });

  it("dispatches combined project welcome emails", async () => {
    const payload = {
      to: "new@example.com",
      workspaceName: "Acme",
      projectName: "Alpha",
      temporaryPassword: "Temp!",
      inviteHandoffToken: "token"
    };
    const result = await worker.process({
      data: { type: "sendProjectInviteWelcome", payload }
    } as never);

    expect(memberMailer.sendProjectInviteWelcome).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ ok: true, emailSent: true, reason: undefined });
  });

  it("dispatches combined project existing-user emails", async () => {
    const payload = {
      to: "old@example.com",
      workspaceName: "Acme",
      projectName: "Alpha",
      workspaceJoined: false
    };
    const result = await worker.process({
      data: { type: "sendProjectInviteExisting", payload }
    } as never);

    expect(memberMailer.sendProjectInviteExisting).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ ok: true, emailSent: true, reason: undefined });
  });

  it("retries when SMTP send fails", async () => {
    memberMailer.sendProjectInviteWelcome.mockResolvedValue({
      sent: false,
      reason: "failed",
      detail: "SMTP down"
    });

    await expect(
      worker.process({
        data: {
          type: "sendProjectInviteWelcome",
          payload: {
            to: "new@example.com",
            workspaceName: "Acme",
            projectName: "Alpha",
            temporaryPassword: "Temp!",
            inviteHandoffToken: "token"
          }
        }
      } as never)
    ).rejects.toThrow(/SMTP down/);
  });

  it("rejects unknown mail job types", async () => {
    await expect(
      worker.process({ data: { type: "sendUnknown", payload: {} } } as never)
    ).rejects.toThrow(/Unknown mail job type/);
  });
});
