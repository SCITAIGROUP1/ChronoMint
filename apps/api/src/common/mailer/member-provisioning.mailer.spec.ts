import { describe, expect, it, vi, beforeEach } from "vitest";
import { adminClientOrigin } from "./admin-origin.util";
import { memberClientOrigin } from "./client-origin.util";
import { buildInviteLoginUrl } from "./invite-login-url.util";
import { MemberProvisioningMailer } from "./member-provisioning.mailer";

describe("MemberProvisioningMailer", () => {
  let mailer: MemberProvisioningMailer;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    send = vi.fn().mockResolvedValue({ sent: true });
    mailer = new MemberProvisioningMailer({ send, isConfigured: true } as never);
  });

  it("sends member credentials to the client portal", async () => {
    const inviteHandoffToken = "invite-jwt-token";
    await mailer.sendNewMemberCredentials({
      to: "member@example.com",
      workspaceName: "Acme",
      temporaryPassword: "TempPass123!",
      inviteHandoffToken,
      role: "MEMBER"
    });

    const loginUrl = buildInviteLoginUrl(memberClientOrigin(), inviteHandoffToken);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["member@example.com"],
        subject: expect.stringContaining("You've been added to Acme"),
        text: expect.stringContaining(loginUrl)
      })
    );
    expect(send.mock.calls[0]?.[0]?.text).toContain("Sign in to Kloqra");
    expect(send.mock.calls[0]?.[0]?.html).not.toContain("localhost:3002");
  });

  it("sends workspace admin credentials to the admin portal", async () => {
    const inviteHandoffToken = "invite-jwt-token";
    await mailer.sendNewMemberCredentials({
      to: "admin@example.com",
      workspaceName: "Acme",
      temporaryPassword: "TempPass123!",
      inviteHandoffToken,
      role: "ADMIN"
    });

    const loginUrl = buildInviteLoginUrl(adminClientOrigin(), inviteHandoffToken);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: expect.stringContaining("Workspace admin access for Acme"),
        text: expect.stringContaining(loginUrl)
      })
    );
    expect(send.mock.calls[0]?.[0]?.text).toContain("Sign in to Kloqra Admin");
    expect(send.mock.calls[0]?.[0]?.html).not.toContain("localhost:3000");
    expect(send.mock.calls[0]?.[0]?.html).toContain("invite=invite-jwt-token");
    expect(send.mock.calls[0]?.[0]?.html).toContain("auto=1");
  });

  it("sends existing workspace admin to the admin portal", async () => {
    await mailer.sendWorkspaceAdded({
      to: "admin@example.com",
      workspaceName: "Acme",
      role: "ADMIN"
    });

    const adminLogin = `${adminClientOrigin()}/login`;
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: expect.stringContaining("Workspace admin access for Acme"),
        html: expect.stringContaining(adminLogin),
        text: expect.stringContaining("Sign in to Kloqra Admin")
      })
    );
  });

  it("sends existing member to the client portal", async () => {
    await mailer.sendWorkspaceAdded({
      to: "member@example.com",
      workspaceName: "Acme",
      role: "MEMBER"
    });

    const clientLogin = `${memberClientOrigin()}/login`;
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["member@example.com"],
        html: expect.stringContaining(clientLogin),
        text: expect.stringContaining("Sign in to Kloqra")
      })
    );
  });
});
