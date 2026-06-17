import { describe, expect, it } from "vitest";
import { inviteMemberSchema } from "./workspace.dto";

describe("inviteMemberSchema", () => {
  it("requires name when inviting a member", () => {
    const result = inviteMemberSchema.safeParse({
      email: "member@example.com",
      role: "MEMBER"
    });

    expect(result.success).toBe(false);
  });

  it("accepts email, role, and name", () => {
    const result = inviteMemberSchema.safeParse({
      email: "member@example.com",
      role: "MEMBER",
      name: "Alex Chen"
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Alex Chen");
    }
  });
});
