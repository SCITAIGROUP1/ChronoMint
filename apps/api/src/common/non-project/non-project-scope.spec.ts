import { describe, expect, it } from "vitest";
import { timeLogWorkspaceWhere } from "./non-project-scope";

describe("timeLogWorkspaceWhere", () => {
  it("includes project and tenant non-project rows by default", () => {
    expect(timeLogWorkspaceWhere("ws-1", "t-1")).toEqual({
      OR: [
        { task: { project: { workspaceId: "ws-1" } } },
        { classification: { not: "PROJECT" }, tenantId: "t-1" }
      ]
    });
  });

  it("drops non-project rows when excluded or project-scoped", () => {
    expect(timeLogWorkspaceWhere("ws-1", "t-1", { nonProjectTime: "exclude" })).toEqual({
      task: { project: { workspaceId: "ws-1" } }
    });
    expect(timeLogWorkspaceWhere("ws-1", "t-1", { projectScoped: true })).toEqual({
      task: { project: { workspaceId: "ws-1" } }
    });
  });

  it("returns only tenant non-project rows when mode is only", () => {
    expect(timeLogWorkspaceWhere("ws-1", "t-1", { nonProjectTime: "only" })).toEqual({
      classification: { not: "PROJECT" },
      tenantId: "t-1"
    });
  });

  it("keeps only-non-project even when a project filter is also set", () => {
    expect(
      timeLogWorkspaceWhere("ws-1", "t-1", { nonProjectTime: "only", projectScoped: true })
    ).toEqual({
      classification: { not: "PROJECT" },
      tenantId: "t-1"
    });
  });

  it("keeps non-project rows when include is set with a project filter", () => {
    expect(
      timeLogWorkspaceWhere("ws-1", "t-1", { nonProjectTime: "include", projectScoped: true })
    ).toEqual({
      OR: [
        { task: { project: { workspaceId: "ws-1" } } },
        { classification: { not: "PROJECT" }, tenantId: "t-1" }
      ]
    });
  });
});
