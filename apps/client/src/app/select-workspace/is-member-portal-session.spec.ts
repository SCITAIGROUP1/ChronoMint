import { describe, expect, it } from "vitest";
import { isMemberPortalSession } from "./is-member-portal-session";

describe("isMemberPortalSession", () => {
  it("treats plain members as member portal", () => {
    expect(
      isMemberPortalSession({
        workspaceRole: "MEMBER",
        managedProjectIds: []
      })
    ).toBe(true);
  });

  it("treats project managers as admin picker", () => {
    expect(
      isMemberPortalSession({
        workspaceRole: "MEMBER",
        managedProjectIds: ["project-1"]
      })
    ).toBe(false);
  });

  it("treats workspace admins as admin picker", () => {
    expect(isMemberPortalSession({ workspaceRole: "ADMIN" })).toBe(false);
  });
});
