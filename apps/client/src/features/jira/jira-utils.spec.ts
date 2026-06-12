import { describe, expect, it } from "vitest";
import { jiraPriorityColor, jiraStatusColor } from "./jira-utils";

describe("jiraStatusColor", () => {
  it("returns green classes for done and closed", () => {
    expect(jiraStatusColor("Done")).toContain("bg-green-100");
    expect(jiraStatusColor("Closed")).toContain("bg-green-100");
  });

  it("returns blue classes for in-progress and review", () => {
    expect(jiraStatusColor("In Progress")).toContain("bg-blue-100");
    expect(jiraStatusColor("In Review")).toContain("bg-blue-100");
  });

  it("returns muted for unrecognised statuses", () => {
    expect(jiraStatusColor("To Do")).toBe("bg-muted text-muted-foreground");
  });
});

describe("jiraPriorityColor", () => {
  it("returns muted for null priority", () => {
    expect(jiraPriorityColor(null)).toBe("text-muted-foreground");
  });

  it("returns red for highest and blocker", () => {
    expect(jiraPriorityColor("Highest")).toBe("text-red-500");
    expect(jiraPriorityColor("Blocker")).toBe("text-red-500");
  });

  it("returns orange for high", () => {
    expect(jiraPriorityColor("High")).toBe("text-orange-500");
  });

  it("returns amber for medium", () => {
    expect(jiraPriorityColor("Medium")).toBe("text-amber-500");
  });

  it("returns muted for low and lowest", () => {
    expect(jiraPriorityColor("Low")).toBe("text-muted-foreground");
    expect(jiraPriorityColor("Lowest")).toBe("text-muted-foreground");
  });

  it("is case-insensitive", () => {
    expect(jiraPriorityColor("HIGHEST")).toBe("text-red-500");
    expect(jiraPriorityColor("high")).toBe("text-orange-500");
  });
});
