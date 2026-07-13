import { describe, expect, it } from "vitest";
import { formatTeamMemberJoinedAt } from "./format-team-member-joined";

describe("formatTeamMemberJoinedAt", () => {
  it("returns em dash when missing or invalid", () => {
    expect(formatTeamMemberJoinedAt(undefined)).toBe("—");
    expect(formatTeamMemberJoinedAt("not-a-date")).toBe("—");
  });

  it("formats a valid ISO timestamp as a short local date", () => {
    const label = formatTeamMemberJoinedAt("2026-06-15T10:00:00.000Z");
    expect(label).not.toBe("—");
    expect(label).toMatch(/2026/);
  });
});
