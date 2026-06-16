import type { TeamMemberOverviewDto } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";

function shouldShowResendCredentials(member: Pick<TeamMemberOverviewDto, "pendingCredentials">) {
  return member.pendingCredentials === true;
}

describe("team member resend credentials", () => {
  it("shows resend when member still has a temporary password", () => {
    expect(shouldShowResendCredentials({ pendingCredentials: true })).toBe(true);
    expect(shouldShowResendCredentials({ pendingCredentials: false })).toBe(false);
  });
});
