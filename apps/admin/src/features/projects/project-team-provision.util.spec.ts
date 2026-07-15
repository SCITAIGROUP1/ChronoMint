import { describe, expect, it } from "vitest";
import {
  buildInvitePerson,
  mergeInvitePeople,
  nameFromEmail,
  parseProjectProvisionLines
} from "./project-team-provision.util";

describe("nameFromEmail", () => {
  it("turns local-part into a readable name", () => {
    expect(nameFromEmail("jane.doe@example.com")).toBe("jane doe");
  });
});

describe("buildInvitePerson", () => {
  it("uses explicit name when provided", () => {
    expect(buildInvitePerson("Ada@Example.com", " Ada Lovelace ")).toEqual({
      email: "ada@example.com",
      name: "Ada Lovelace"
    });
  });

  it("falls back to email local-part when name is blank", () => {
    expect(buildInvitePerson("bob.builder@example.com", "  ")).toEqual({
      email: "bob.builder@example.com",
      name: "bob builder"
    });
  });

  it("rejects invalid email", () => {
    expect(buildInvitePerson("not-an-email", "Ada")).toBeNull();
  });
});

describe("parseProjectProvisionLines", () => {
  it("parses email, name rows", () => {
    const { members, errors } = parseProjectProvisionLines(
      "ada@example.com, Ada Lovelace\nbob@example.com, Bob"
    );
    expect(errors).toEqual([]);
    expect(members).toEqual([
      { email: "ada@example.com", name: "Ada Lovelace" },
      { email: "bob@example.com", name: "Bob" }
    ]);
  });

  it("derives a name from email local-part when name omitted", () => {
    const { members, errors } = parseProjectProvisionLines("jane.doe@example.com");
    expect(errors).toEqual([]);
    expect(members).toEqual([{ email: "jane.doe@example.com", name: "jane doe" }]);
  });

  it("reports invalid emails", () => {
    const { members, errors } = parseProjectProvisionLines("not-an-email, Person");
    expect(members).toEqual([]);
    expect(errors[0]).toMatch(/valid email/i);
  });
});

describe("mergeInvitePeople", () => {
  it("dedupes by email and updates name", () => {
    const merged = mergeInvitePeople(
      [{ email: "a@example.com", name: "A" }],
      [
        { email: "a@example.com", name: "Ada" },
        { email: "b@example.com", name: "Bea" }
      ]
    );
    expect(merged).toEqual([
      { email: "a@example.com", name: "Ada" },
      { email: "b@example.com", name: "Bea" }
    ]);
  });
});
