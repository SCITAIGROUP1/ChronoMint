import { describe, expect, it } from "vitest";
import { isWorkspaceQuerySessionReady } from "./workspace-query-enabled";

function makeToken(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `hdr.${body}.sig`;
}

describe("isWorkspaceQuerySessionReady", () => {
  it("is false while JWT workspace lags session after a switch", () => {
    const accessToken = makeToken({ userId: "u1", workspaceId: "ws-old" });
    expect(
      isWorkspaceQuerySessionReady({
        enabled: true,
        workspaceId: "ws-new",
        sessionUserId: "u1",
        sessionWorkspaceId: "ws-new",
        accessToken
      })
    ).toBe(false);
  });

  it("is true when session and JWT agree on user and workspace", () => {
    const accessToken = makeToken({ userId: "u1", workspaceId: "ws-1" });
    expect(
      isWorkspaceQuerySessionReady({
        enabled: true,
        workspaceId: "ws-1",
        sessionUserId: "u1",
        sessionWorkspaceId: "ws-1",
        accessToken
      })
    ).toBe(true);
  });

  it("is false when enabled is false", () => {
    const accessToken = makeToken({ userId: "u1", workspaceId: "ws-1" });
    expect(
      isWorkspaceQuerySessionReady({
        enabled: false,
        workspaceId: "ws-1",
        sessionUserId: "u1",
        sessionWorkspaceId: "ws-1",
        accessToken
      })
    ).toBe(false);
  });
});
