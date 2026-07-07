import { describe, expect, it } from "vitest";
import { requireWorkspaceUser } from "./workspace-context.util";

describe("requireWorkspaceUser", () => {
  it("returns workspace user when context is present", () => {
    const user = requireWorkspaceUser({
      userId: "u1",
      tenantId: "t1",
      workspaceId: "ws1",
      role: "ADMIN"
    });
    expect(user.workspaceId).toBe("ws1");
  });

  it("throws when workspace context is missing", () => {
    expect(() =>
      requireWorkspaceUser({
        userId: "u1",
        tenantId: "t1"
      })
    ).toThrow("Workspace required");
  });
});
