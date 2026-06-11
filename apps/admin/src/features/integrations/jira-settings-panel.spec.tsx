import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { JiraSettingsPanel } from "./jira-settings-panel";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams()
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

vi.mock("@kloqra/web-shared", () => ({
  buildJiraTimerDeepLink: vi.fn(() => "http://localhost:3000/timer?jiraIssue=PROJ-1"),
  disconnectJira: vi.fn(),
  fetchJiraConnectUrl: vi.fn(),
  fetchJiraConnectionStatus: vi.fn(() => Promise.resolve({ connected: false, configured: true })),
  fetchJiraProjectMappings: vi.fn(() => Promise.resolve([])),
  fetchListItems: vi.fn(() => Promise.resolve([])),
  saveJiraProjectMappings: vi.fn()
}));

describe("JiraSettingsPanel", () => {
  it("renders the Jira integration card", () => {
    const html = renderToStaticMarkup(<JiraSettingsPanel workspaceId="ws-1" />);
    expect(html).toContain("Jira integration");
  });
});
