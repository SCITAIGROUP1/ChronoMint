import { describe, expect, it } from "vitest";
import { jiraStatusColor, jiraSyncLogStatusColor } from "./jira-utils";

describe("jiraStatusColor", () => {
  it("returns green classes for done status", () => {
    expect(jiraStatusColor("Done")).toContain("bg-green-100");
    expect(jiraStatusColor("Closed")).toContain("bg-green-100");
  });

  it("returns blue classes for in-progress status", () => {
    expect(jiraStatusColor("In Progress")).toContain("bg-blue-100");
    expect(jiraStatusColor("In Review")).toContain("bg-blue-100");
  });

  it("returns muted classes for unknown status", () => {
    expect(jiraStatusColor("To Do")).toBe("bg-muted text-muted-foreground");
    expect(jiraStatusColor("Backlog")).toBe("bg-muted text-muted-foreground");
  });

  it("is case-insensitive", () => {
    expect(jiraStatusColor("DONE")).toContain("bg-green-100");
    expect(jiraStatusColor("in progress")).toContain("bg-blue-100");
  });
});

describe("jiraSyncLogStatusColor", () => {
  it("returns green for SUCCESS", () => {
    expect(jiraSyncLogStatusColor("SUCCESS")).toContain("bg-green-100");
  });

  it("returns red for FAILED", () => {
    expect(jiraSyncLogStatusColor("FAILED")).toContain("bg-red-100");
  });

  it("returns amber for PARTIAL", () => {
    expect(jiraSyncLogStatusColor("PARTIAL")).toContain("bg-amber-100");
  });
});
