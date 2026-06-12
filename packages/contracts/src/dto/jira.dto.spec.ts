import { describe, expect, it } from "vitest";
import { ROUTES } from "../routes";
import {
  jiraConnectionStatusSchema,
  jiraProjectMappingSchema,
  listIssuesQuerySchema,
  listSyncLogsQuerySchema,
  setUserMappingSchema,
  upsertProjectMappingSchema
} from "./jira.dto";

describe("ROUTES.JIRA", () => {
  it("exposes static auth routes", () => {
    expect(ROUTES.JIRA.AUTH_STATUS).toBe("/jira/auth/status");
    expect(ROUTES.JIRA.AUTH_CONNECT).toBe("/jira/auth/connect");
    expect(ROUTES.JIRA.AUTH_CALLBACK).toBe("/jira/auth/callback");
    expect(ROUTES.JIRA.AUTH_DISCONNECT).toBe("/jira/auth/disconnect");
  });

  it("exposes project mapping route with id param", () => {
    expect(ROUTES.JIRA.PROJECT_MAPPING("abc-123")).toBe("/jira/projects/mappings/abc-123");
  });

  it("exposes issue, user, worklog, and log routes", () => {
    expect(ROUTES.JIRA.ISSUES).toBe("/jira/issues");
    expect(ROUTES.JIRA.MY_ISSUES).toBe("/jira/issues/my");
    expect(ROUTES.JIRA.USERS).toBe("/jira/users");
    expect(ROUTES.JIRA.WORKLOGS).toBe("/jira/worklogs");
    expect(ROUTES.JIRA.LOGS).toBe("/jira/logs");
  });
});

describe("jiraConnectionStatusSchema", () => {
  it("accepts disconnected state", () => {
    const r = jiraConnectionStatusSchema.safeParse({ connected: false });
    expect(r.success).toBe(true);
  });

  it("accepts connected state with site details", () => {
    const r = jiraConnectionStatusSchema.safeParse({
      connected: true,
      siteUrl: "https://kloqra-test.atlassian.net",
      siteName: "Kloqra Test",
      email: "admin@kloqra.dev",
      isActive: true
    });
    expect(r.success).toBe(true);
  });
});

describe("upsertProjectMappingSchema", () => {
  it("accepts a valid mapping payload", () => {
    const r = upsertProjectMappingSchema.safeParse({
      jiraProjectId: "10001",
      jiraProjectKey: "KLQ",
      jiraProjectName: "Kloqra",
      syncEnabled: true,
      syncDirection: "JIRA_TO_CHRONO"
    });
    expect(r.success).toBe(true);
  });

  it("accepts payload without chronoProjectId (optional link)", () => {
    const r = upsertProjectMappingSchema.safeParse({
      jiraProjectId: "10001",
      jiraProjectKey: "KLQ",
      jiraProjectName: "Kloqra"
    });
    expect(r.success).toBe(true);
  });

  it("requires jiraProjectId", () => {
    const r = upsertProjectMappingSchema.safeParse({
      jiraProjectKey: "KLQ",
      jiraProjectName: "Kloqra"
    });
    expect(r.success).toBe(false);
  });
});

describe("jiraProjectMappingSchema", () => {
  it("accepts a full mapping object", () => {
    const r = jiraProjectMappingSchema.safeParse({
      id: "map-1",
      connectionId: "conn-1",
      jiraProjectId: "10001",
      jiraProjectKey: "KLQ",
      jiraProjectName: "Kloqra",
      syncEnabled: true,
      syncDirection: "JIRA_TO_CHRONO",
      lastSyncAt: null
    });
    expect(r.success).toBe(true);
  });

  it("accepts mapping without chronoProjectId (unlinked project)", () => {
    const r = jiraProjectMappingSchema.safeParse({
      id: "map-2",
      connectionId: "conn-1",
      jiraProjectId: "10002",
      jiraProjectKey: "KLQ2",
      jiraProjectName: "Kloqra 2",
      syncEnabled: false,
      syncDirection: "JIRA_TO_CHRONO",
      lastSyncAt: null
    });
    expect(r.success).toBe(true);
  });
});

describe("listIssuesQuerySchema", () => {
  it("applies default page and limit", () => {
    const r = listIssuesQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.limit).toBe(25);
    }
  });

  it("accepts optional filters", () => {
    const r = listIssuesQuerySchema.safeParse({
      search: "login bug",
      status: "In Progress",
      projectKey: "KLQ",
      sprintId: "sprint-5"
    });
    expect(r.success).toBe(true);
  });
});

describe("listSyncLogsQuerySchema", () => {
  it("applies default page and limit", () => {
    const r = listSyncLogsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.limit).toBe(50);
    }
  });

  it("accepts status filter", () => {
    const r = listSyncLogsQuerySchema.safeParse({ status: "FAILED" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("FAILED");
  });
});

describe("setUserMappingSchema", () => {
  it("requires jiraAccountId and userId", () => {
    const r = setUserMappingSchema.safeParse({ jiraAccountId: "atlassian-id" });
    expect(r.success).toBe(false);
  });

  it("accepts a complete mapping", () => {
    const r = setUserMappingSchema.safeParse({
      jiraAccountId: "atlassian-acc-123",
      userId: "kloqra-user-456"
    });
    expect(r.success).toBe(true);
  });
});
