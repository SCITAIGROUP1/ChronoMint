import { describe, expect, it } from "vitest";
import { memberProjectHeaderMeta } from "./member-project-header-meta";

describe("memberProjectHeaderMeta", () => {
  it("hides Active badge and strips Client label", () => {
    expect(memberProjectHeaderMeta({ clientName: "abc corp", isActive: true })).toEqual({
      showInactiveBadge: false,
      clientSubtitle: "abc corp"
    });
  });

  it("shows Inactive badge when project is inactive", () => {
    expect(memberProjectHeaderMeta({ clientName: "  Acme  ", isActive: false })).toEqual({
      showInactiveBadge: true,
      clientSubtitle: "Acme"
    });
  });

  it("returns null client subtitle when missing", () => {
    expect(memberProjectHeaderMeta({ clientName: null, isActive: true })).toEqual({
      showInactiveBadge: false,
      clientSubtitle: null
    });
    expect(memberProjectHeaderMeta({ clientName: "   ", isActive: true })).toEqual({
      showInactiveBadge: false,
      clientSubtitle: null
    });
  });
});
