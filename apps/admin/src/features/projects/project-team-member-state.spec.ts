import { describe, expect, it } from "vitest";
import { memberCanActivate, memberIsActive } from "./project-team-member-state";

describe("project team member state", () => {
  it("treats missing isActive as active", () => {
    expect(memberIsActive({ isActive: undefined })).toBe(true);
  });

  it("allows activation only for inactive members still in the workspace", () => {
    const workspaceIds = new Set(["u1"]);

    expect(memberCanActivate({ userId: "u1", isActive: false }, workspaceIds)).toBe(true);
    expect(memberCanActivate({ userId: "u1", isActive: true }, workspaceIds)).toBe(false);
    expect(memberCanActivate({ userId: "u2", isActive: false }, workspaceIds)).toBe(false);
  });
});
