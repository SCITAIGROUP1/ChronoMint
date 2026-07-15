import { describe, expect, it } from "vitest";
import {
  listProjectTeamQuerySchema,
  provisionProjectTeamMembersResponseSchema,
  provisionProjectTeamMembersSchema,
  teamMemberSchema,
  updateTeamMemberSchema
} from "./team.dto";

const MEMBER_ID = "00000000-0000-4000-8000-000000000001";
const TEAM_ID = "00000000-0000-4000-8000-000000000002";
const USER_ID = "00000000-0000-4000-8000-000000000003";

describe("teamMemberSchema", () => {
  it("accepts PROJECT_MANAGER and MEMBER roles", () => {
    for (const role of ["PROJECT_MANAGER", "MEMBER"] as const) {
      const result = teamMemberSchema.safeParse({
        id: MEMBER_ID,
        teamId: TEAM_ID,
        userId: USER_ID,
        userName: "Alex PM",
        userEmail: "alex@example.com",
        role,
        isActive: true
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts optional createdAt when the member joined the team", () => {
    const result = teamMemberSchema.safeParse({
      id: MEMBER_ID,
      teamId: TEAM_ID,
      userId: USER_ID,
      userName: "Alex PM",
      userEmail: "alex@example.com",
      role: "MEMBER",
      isActive: true,
      createdAt: "2026-07-01T12:00:00.000Z"
    });
    expect(result.success).toBe(true);
    expect(result.data?.createdAt).toBe("2026-07-01T12:00:00.000Z");
  });
});

describe("updateTeamMemberSchema", () => {
  it("accepts role update", () => {
    const result = updateTeamMemberSchema.safeParse({ role: "PROJECT_MANAGER" });
    expect(result.success).toBe(true);
  });

  it("requires at least one field", () => {
    expect(updateTeamMemberSchema.safeParse({}).success).toBe(false);
  });
});

describe("listProjectTeamQuerySchema", () => {
  it("parses without role — role is undefined", () => {
    const result = listProjectTeamQuerySchema.safeParse({ page: "1", limit: "25" });
    expect(result.success).toBe(true);
    expect(result.data?.role).toBeUndefined();
  });

  it("accepts PROJECT_MANAGER as role filter", () => {
    const result = listProjectTeamQuerySchema.safeParse({
      page: "1",
      limit: "25",
      role: "PROJECT_MANAGER"
    });
    expect(result.success).toBe(true);
    expect(result.data?.role).toBe("PROJECT_MANAGER");
  });

  it("accepts MEMBER as role filter", () => {
    const result = listProjectTeamQuerySchema.safeParse({
      page: "1",
      limit: "25",
      role: "MEMBER"
    });
    expect(result.success).toBe(true);
    expect(result.data?.role).toBe("MEMBER");
  });

  it("rejects invalid role values", () => {
    const result = listProjectTeamQuerySchema.safeParse({
      page: "1",
      limit: "25",
      role: "ADMIN"
    });
    expect(result.success).toBe(false);
  });
});

describe("provisionProjectTeamMembersSchema", () => {
  it("accepts 1–100 email+name members", () => {
    const result = provisionProjectTeamMembersSchema.safeParse({
      members: [{ email: "a@example.com", name: "Ada" }]
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty members", () => {
    expect(provisionProjectTeamMembersSchema.safeParse({ members: [] }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(
      provisionProjectTeamMembersSchema.safeParse({
        members: [{ email: "a@example.com", name: "" }]
      }).success
    ).toBe(false);
  });
});

describe("provisionProjectTeamMembersResponseSchema", () => {
  it("accepts queued bulk response", () => {
    expect(
      provisionProjectTeamMembersResponseSchema.safeParse({
        jobId: "job-1",
        status: "queued",
        enqueuedCount: 2
      }).success
    ).toBe(true);
  });

  it("rejects sync-style result payloads", () => {
    expect(
      provisionProjectTeamMembersResponseSchema.safeParse({
        results: [],
        addedCount: 0,
        failedCount: 0
      }).success
    ).toBe(false);
  });
});
