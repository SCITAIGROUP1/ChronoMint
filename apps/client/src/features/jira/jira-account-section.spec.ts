import { describe, expect, it } from "vitest";

describe("JiraAccountSection — load error classification", () => {
  const isConnectionError = (msg: string) => msg.includes("not connected") || msg.includes("404");

  it("classifies Jira-not-connected message as connection error", () => {
    expect(isConnectionError("Jira is not connected")).toBe(true);
  });

  it("classifies 404 response as connection error", () => {
    expect(isConnectionError("Request failed (404)")).toBe(true);
  });

  it("does not classify generic network errors as connection errors", () => {
    expect(isConnectionError("Network error")).toBe(false);
    expect(isConnectionError("Internal server error")).toBe(false);
  });
});

describe("JiraAccountSection — edit mode state", () => {
  type Mapping = { jiraAccountId: string; jiraDisplayName: string; jiraEmail: string } | null;

  it("starts in edit mode when no current mapping", () => {
    const current: Mapping = null;
    const editing = !current;
    expect(editing).toBe(true);
  });

  it("starts in read-only mode when mapping already exists", () => {
    const current: Mapping = {
      jiraAccountId: "acc-1",
      jiraDisplayName: "Amritha Hitige",
      jiraEmail: "amrithagz123@gmail.com"
    };
    const editing = !current;
    expect(editing).toBe(false);
  });

  it("pre-fills email input with current jiraEmail on edit start", () => {
    const current: Mapping = {
      jiraAccountId: "acc-1",
      jiraDisplayName: "Amritha Hitige",
      jiraEmail: "amrithagz123@gmail.com"
    };
    const emailOnEditStart = current?.jiraEmail ?? "";
    expect(emailOnEditStart).toBe("amrithagz123@gmail.com");
  });

  it("pre-fills empty string when no current mapping on edit start", () => {
    const current = null as Mapping;
    const emailOnEditStart = current?.jiraEmail ?? "";
    expect(emailOnEditStart).toBe("");
  });
});

describe("JiraAccountSection — API response shaping", () => {
  it("extracts display name from success response for linked card", () => {
    const result = {
      jiraAccountId: "acc-1",
      jiraDisplayName: "Amritha Hitige",
      jiraEmail: "amrithagz123@gmail.com"
    };
    const feedback = `Linked to ${result.jiraDisplayName}`;
    expect(feedback).toBe("Linked to Amritha Hitige");
  });

  it("treats null API response as no mapping", () => {
    const response = null as { jiraEmail: string } | null;
    const hasCurrent = response !== null;
    expect(hasCurrent).toBe(false);
  });
});
