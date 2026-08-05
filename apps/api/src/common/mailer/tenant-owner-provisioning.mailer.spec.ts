import { describe, expect, it, vi, beforeEach } from "vitest";
import { appOrigin } from "./app-origin.util";
import { buildInviteLoginUrl } from "./invite-login-url.util";
import { TenantOwnerProvisioningMailer } from "./tenant-owner-provisioning.mailer";

describe("TenantOwnerProvisioningMailer", () => {
  let mailer: TenantOwnerProvisioningMailer;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    send = vi.fn().mockResolvedValue({ sent: true });
    mailer = new TenantOwnerProvisioningMailer({ send, isConfigured: true } as never);
  });

  it("sends tenant admin credentials to the unified app", async () => {
    const inviteHandoffToken = "invite-jwt-token";
    await mailer.sendTenantAdminCredentials({
      to: "admin@example.com",
      organizationName: "ABC",
      temporaryPassword: "TempPass123!",
      inviterName: "Kloqra Platform",
      inviteHandoffToken
    });

    const loginUrl = buildInviteLoginUrl(appOrigin(), inviteHandoffToken);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: expect.stringContaining("Organization admin access for ABC"),
        text: expect.stringContaining(loginUrl)
      })
    );
    expect(send.mock.calls[0]?.[0]?.html).toContain("Kloqra Platform");
    expect(send.mock.calls[0]?.[0]?.html).toContain("invite=invite-jwt-token");
    expect(send.mock.calls[0]?.[0]?.html).toContain("auto=1");
    expect(send.mock.calls[0]?.[0]?.text).toContain("Sign in to Kloqra");
  });

  it("sends tenant admin added notice to the unified app", async () => {
    await mailer.sendTenantAdminAdded({
      to: "admin@example.com",
      organizationName: "ABC",
      inviterName: "Jordan Owner"
    });

    const adminLogin = `${appOrigin()}/login`;
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        html: expect.stringContaining(adminLogin),
        text: expect.stringContaining("organization administrator")
      })
    );
  });
});
