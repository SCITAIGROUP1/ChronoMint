import { describe, expect, it } from "vitest";
import { teamInviteSuccessMessage } from "./project-team-tab";

describe("teamInviteSuccessMessage", () => {
  it("reports when invite email was sent", () => {
    expect(teamInviteSuccessMessage(true)).toBe("Invite link generated and email sent.");
  });

  it("reports link-only invite when email was not sent", () => {
    expect(teamInviteSuccessMessage(false)).toBe("Invite link generated.");
    expect(teamInviteSuccessMessage(undefined)).toBe("Invite link generated.");
  });
});
