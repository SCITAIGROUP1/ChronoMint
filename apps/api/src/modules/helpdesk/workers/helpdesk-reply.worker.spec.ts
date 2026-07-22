import { describe, expect, it, vi } from "vitest";
import { HelpdeskReplyWorker } from "./helpdesk-reply.worker";

describe("HelpdeskReplyWorker", () => {
  it("reauthorizes the platform actor before sending email", async () => {
    const mailer = { send: vi.fn() };
    const prisma = { helpDeskTicketMessage: { update: vi.fn() } };
    const authorization = { assertAllowed: vi.fn().mockRejectedValue(new Error("revoked")) };
    const worker = new HelpdeskReplyWorker(
      mailer as never,
      prisma as never,
      authorization as never
    );

    await expect(
      worker.process({
        id: "job-1",
        data: {
          actorPlatformUserId: "platform-1",
          ticketId: "ticket-1",
          messageId: "message-1",
          toEmail: "customer@example.com",
          toName: "Customer",
          subject: "Re: ticket",
          body: "Reply",
          htmlBody: "<p>Reply</p>"
        }
      } as never)
    ).rejects.toThrow("revoked");

    expect(authorization.assertAllowed).toHaveBeenCalledWith({
      principalId: "platform-1",
      permission: "platform:ManageSupportTickets",
      resource: { scope: "platform" }
    });
    expect(mailer.send).not.toHaveBeenCalled();
    expect(prisma.helpDeskTicketMessage.update).not.toHaveBeenCalled();
  });
});
