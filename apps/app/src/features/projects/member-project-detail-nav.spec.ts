import { describe, expect, it } from "vitest";
import {
  buildMemberProjectDetailNavItems,
  myProjectDetailHref,
  resolveMemberProjectDetailSection
} from "./member-project-detail-nav";
import { memberProjectHeaderMeta } from "./member-project-header-meta";

describe("member-project-detail-nav", () => {
  it("builds My Projects section hrefs", () => {
    expect(buildMemberProjectDetailNavItems("proj-1")).toEqual([
      expect.objectContaining({ id: "overview", href: "/my-projects/proj-1/overview" }),
      expect.objectContaining({ id: "team", href: "/my-projects/proj-1/team" }),
      expect.objectContaining({ id: "tasks", href: "/my-projects/proj-1/tasks" })
    ]);
    expect(myProjectDetailHref("proj-1")).toBe("/my-projects/proj-1/overview");
  });

  it("maps paths to section ids", () => {
    expect(resolveMemberProjectDetailSection("/my-projects/x/overview")).toBe("overview");
    expect(resolveMemberProjectDetailSection("/my-projects/x/tasks")).toBe("tasks");
    expect(resolveMemberProjectDetailSection("/my-projects/x/team")).toBe("team");
  });
});

describe("memberProjectHeaderMeta", () => {
  it("hides Active badge and exposes client subtitle", () => {
    expect(memberProjectHeaderMeta({ clientName: "Acme", isActive: true })).toEqual({
      showInactiveBadge: false,
      clientSubtitle: "Acme"
    });
    expect(memberProjectHeaderMeta({ clientName: null, isActive: false })).toEqual({
      showInactiveBadge: true,
      clientSubtitle: null
    });
  });
});
