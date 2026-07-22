import { describe, expect, it, vi } from "vitest";
import { HelpdeskGateway } from "./helpdesk.gateway";

describe("HelpdeskGateway", () => {
  const client = () => ({
    handshake: { auth: { token: "token", scope: "platform" } },
    data: {},
    join: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn()
  });

  it("joins the support room after canonical authorization", async () => {
    const jwt = {
      verifyPlatformAccessToken: vi
        .fn()
        .mockReturnValue({ platformUserId: "platform-1", family: "family-1" })
    };
    const revocation = { assertNotRevoked: vi.fn().mockResolvedValue(undefined) };
    const authorization = { assertAllowed: vi.fn().mockResolvedValue({ allowed: true }) };
    const gateway = new HelpdeskGateway(
      jwt as never,
      revocation as never,
      {} as never,
      authorization as never
    );
    const socket = client();

    await gateway.handleConnection(socket as never);

    expect(authorization.assertAllowed).toHaveBeenCalledWith({
      principalId: "platform-1",
      permission: "platform:ReadSupportTickets",
      resource: { scope: "platform" }
    });
    expect(socket.join).toHaveBeenCalledWith("helpdesk_agents");
  });

  it("disconnects before joining when support access was revoked", async () => {
    const jwt = {
      verifyPlatformAccessToken: vi
        .fn()
        .mockReturnValue({ platformUserId: "platform-1", family: "family-1" })
    };
    const revocation = { assertNotRevoked: vi.fn().mockResolvedValue(undefined) };
    const authorization = { assertAllowed: vi.fn().mockRejectedValue(new Error("revoked")) };
    const gateway = new HelpdeskGateway(
      jwt as never,
      revocation as never,
      {} as never,
      authorization as never
    );
    const socket = client();

    await gateway.handleConnection(socket as never);

    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });
});
