import { describe, expect, it, vi } from "vitest";
import { AuthController } from "./auth.controller";

describe("AuthController prohibited impersonation surface", () => {
  it("does not expose tenant-user impersonation handlers", () => {
    const prototype = AuthController.prototype as unknown as Record<string, unknown>;

    expect(prototype.impersonate).toBeUndefined();
    expect(prototype.completeImpersonation).toBeUndefined();
    expect(prototype.stopImpersonation).toBeUndefined();
  });

  it("requires canonical platform console access for platform me", async () => {
    const auth = { getPlatformMe: vi.fn().mockResolvedValue({ id: "support-1" }) };
    const authorization = { assertAllowed: vi.fn().mockResolvedValue({ allowed: true }) };
    const controller = new AuthController(auth as never, {} as never, authorization as never);

    await controller.me({ headers: { "x-auth-scope": "platform" } } as never, undefined, {
      platformUserId: "support-1",
      platformRole: "SUPPORT"
    });

    expect(authorization.assertAllowed).toHaveBeenCalledWith({
      principalId: "support-1",
      permission: "platform:AccessConsole",
      resource: { scope: "platform" }
    });
  });

  it("uses trusted workspace and tenant session scope for product me", async () => {
    const auth = { getMe: vi.fn().mockResolvedValue({ id: "member-1" }) };
    const authorization = { assertAllowed: vi.fn().mockResolvedValue({ allowed: true }) };
    const controller = new AuthController(auth as never, {} as never, authorization as never);

    await controller.me(
      { headers: {} } as never,
      {
        userId: "member-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        role: "MEMBER"
      },
      undefined
    );

    expect(authorization.assertAllowed).toHaveBeenCalledWith({
      principalId: "member-1",
      permission: "workspace:Access",
      resource: {
        scope: "workspace",
        workspaceId: "workspace-1",
        expectedTenantId: "tenant-1"
      }
    });
  });
});
