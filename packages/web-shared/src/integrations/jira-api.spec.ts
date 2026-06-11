import { describe, expect, it } from "vitest";
import { buildJiraTimerDeepLink } from "./jira-api";

describe("buildJiraTimerDeepLink", () => {
  it("builds timer URL with encoded issue key", () => {
    expect(buildJiraTimerDeepLink("PROJ-123", "https://app.example.com")).toBe(
      "https://app.example.com/timer?jiraIssue=PROJ-123"
    );
  });

  it("encodes special characters in issue key", () => {
    expect(buildJiraTimerDeepLink("PROJ-1", "http://localhost:3000")).toBe(
      "http://localhost:3000/timer?jiraIssue=PROJ-1"
    );
  });
});
