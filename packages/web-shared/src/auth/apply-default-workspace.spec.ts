import { describe, expect, it, vi } from "vitest";
import { applyDefaultWorkspaceIfNeeded } from "./apply-default-workspace";

vi.mock("../api/client", () => ({
  api: vi.fn()
}));

describe("applyDefaultWorkspaceIfNeeded", () => {
  it("skips workspace switch during tenant onboarding", async () => {
    const session = {
      user: { id: "user-1", name: "Owner" },
      tenantId: "tenant-1",
      tenantRole: "OWNER" as const,
      requiresWorkspaceSetup: true as const,
      defaultWorkspaceId: "ws-1"
    };

    const result = await applyDefaultWorkspaceIfNeeded(session, "token");
    expect(result).toEqual({ session, accessToken: "token" });
  });
});
