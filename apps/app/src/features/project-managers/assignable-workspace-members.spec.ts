import { describe, expect, it } from "vitest";
import { assignableWorkspaceMembers } from "./assignable-workspace-members";

describe("assignableWorkspaceMembers", () => {
  it("keeps picker rows when role/isActive are omitted (slim members API)", () => {
    const rows = [
      {
        id: "m1",
        userId: "u1",
        userName: "Sam Rivera",
        userEmail: "member@kloqra.dev"
      },
      {
        id: "m2",
        userId: "u2",
        userName: "Alex Chen",
        userEmail: "alex@kloqra.dev"
      }
    ];

    expect(assignableWorkspaceMembers(rows)).toEqual(rows);
  });

  it("filters inactive and non-member rows when those fields are present", () => {
    const rows = [
      {
        id: "m1",
        userId: "u1",
        userName: "Sam Rivera",
        userEmail: "member@kloqra.dev",
        role: "MEMBER" as const,
        isActive: true
      },
      {
        id: "m2",
        userId: "u2",
        userName: "Casey Admin",
        userEmail: "admin@kloqra.dev",
        role: "ADMIN" as const,
        isActive: true
      },
      {
        id: "m3",
        userId: "u3",
        userName: "Inactive Member",
        userEmail: "inactive@kloqra.dev",
        role: "MEMBER" as const,
        isActive: false
      }
    ];

    expect(assignableWorkspaceMembers(rows)).toEqual([rows[0]]);
  });
});
