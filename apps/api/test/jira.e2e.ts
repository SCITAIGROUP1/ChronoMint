import type { CategoryDto, ProjectDto, TaskDto } from "@kloqra/contracts";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AppModule } from "../src/app.module";
import { TokenCipherService } from "../src/common/crypto/token-cipher.service";
import { integrationPrisma } from "../src/common/prisma/integration-prisma";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { JiraApiClient } from "../src/modules/integrations/jira/infrastructure/jira-api.client";
import { authedAgent, loginAs } from "./helpers/auth";
import { listItems } from "./helpers/pagination";

describe("Jira integration E2E", () => {
  let app: INestApplication;
  let adminSession: Awaited<ReturnType<typeof loginAs>>;
  let memberSession: Awaited<ReturnType<typeof loginAs>>;
  let projectId: string;
  let categoryId: string;
  let taskId: string;
  const mockGetIssue = vi.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(JiraApiClient)
      .useValue({
        getIssue: mockGetIssue,
        exchangeAuthorizationCode: vi.fn(),
        refreshAccessToken: vi.fn(),
        listAccessibleResources: vi.fn()
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    adminSession = await loginAs(app, "admin@kloqra.dev");
    memberSession = await loginAs(app, "member@kloqra.dev");

    const projectsRes = await authedAgent(app, adminSession).get("/projects");
    projectId = listItems<ProjectDto>(projectsRes.body)[0]?.id;
    expect(projectId).toBeTruthy();

    const categoriesRes = await authedAgent(app, adminSession).get("/categories");
    categoryId = listItems<CategoryDto>(categoriesRes.body)[0]?.id;
    expect(categoryId).toBeTruthy();

    const tasksRes = await authedAgent(app, memberSession).get("/tasks").query({ projectId });
    taskId = listItems<TaskDto>(tasksRes.body)[0]?.id;
    expect(taskId).toBeTruthy();

    const prisma = app.get(PrismaService);
    const cipher = app.get(TokenCipherService);
    await integrationPrisma(prisma).jiraConnection.upsert({
      where: { workspaceId: adminSession.workspaceId },
      create: {
        workspaceId: adminSession.workspaceId,
        cloudId: "cloud-test",
        siteUrl: "https://example.atlassian.net",
        accessToken: cipher.encrypt("test-access"),
        refreshToken: cipher.encrypt("test-refresh"),
        expiresAt: new Date(Date.now() + 3600_000),
        connectedById: adminSession.userId
      },
      update: {
        cloudId: "cloud-test",
        siteUrl: "https://example.atlassian.net",
        accessToken: cipher.encrypt("test-access"),
        refreshToken: cipher.encrypt("test-refresh"),
        expiresAt: new Date(Date.now() + 3600_000)
      }
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /integrations/jira/connect-url returns authorize URL when configured", async () => {
    const prevId = process.env.ATLASSIAN_CLIENT_ID;
    const prevSecret = process.env.ATLASSIAN_CLIENT_SECRET;
    const prevRedirect = process.env.ATLASSIAN_REDIRECT_URI;
    process.env.ATLASSIAN_CLIENT_ID = "test-client";
    process.env.ATLASSIAN_CLIENT_SECRET = "test-secret";
    process.env.ATLASSIAN_REDIRECT_URI = "http://localhost:3001/integrations/jira/callback";

    const res = await authedAgent(app, adminSession).get("/integrations/jira/connect-url");
    expect(res.status).toBe(200);
    expect(res.body.url).toContain("auth.atlassian.com/authorize");

    process.env.ATLASSIAN_CLIENT_ID = prevId;
    process.env.ATLASSIAN_CLIENT_SECRET = prevSecret;
    process.env.ATLASSIAN_REDIRECT_URI = prevRedirect;
  });

  it("GET /integrations/jira/status reports connected", async () => {
    const res = await authedAgent(app, adminSession).get("/integrations/jira/status");
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.siteUrl).toContain("atlassian.net");
  });

  it("PUT /integrations/jira/project-mappings stores mapping", async () => {
    const res = await authedAgent(app, adminSession)
      .put("/integrations/jira/project-mappings")
      .send({
        mappings: [
          {
            jiraProjectKey: "PROJ",
            chronomintProjectId: projectId,
            autoCreateTasks: true,
            defaultCategoryId: categoryId
          }
        ]
      });
    expect(res.status).toBe(200);
    const projMapping = (res.body as Array<{ jiraProjectKey: string }>).find(
      (m) => m.jiraProjectKey === "PROJ"
    );
    expect(projMapping?.jiraProjectKey).toBe("PROJ");
  });

  it("POST /timer/start accepts personal access token auth", async () => {
    try {
      await authedAgent(app, memberSession).post("/timer/discard");
    } catch {
      // no active timer
    }

    const tokenRes = await authedAgent(app, memberSession)
      .post("/auth/personal-tokens")
      .send({ name: "E2E Forge" });
    expect(tokenRes.status).toBe(201);
    const pat = tokenRes.body.token as string;
    expect(pat.startsWith("klo_pat_")).toBe(true);

    const startRes = await request(app.getHttpServer())
      .post("/timer/start")
      .set("Authorization", `Bearer ${pat}`)
      .set("X-Workspace-Id", memberSession.workspaceId)
      .set("X-Auth-Scope", "client")
      .send({ taskId });
    expect(startRes.status).toBe(201);
    expect(startRes.body.taskId).toBe(taskId);

    await request(app.getHttpServer())
      .post("/timer/stop")
      .set("Authorization", `Bearer ${pat}`)
      .set("X-Workspace-Id", memberSession.workspaceId)
      .set("X-Auth-Scope", "client")
      .send({});
  });

  it("GET /integrations/jira/resolve auto-creates task from issue key", async () => {
    const issueKey = `PROJ-${Date.now() % 100000}`;
    mockGetIssue.mockResolvedValueOnce({
      id: "10001",
      key: issueKey,
      summary: "Jira e2e issue",
      projectKey: "PROJ"
    });

    const res = await authedAgent(app, memberSession)
      .get("/integrations/jira/resolve")
      .query({ issueKey });

    expect(res.status).toBe(200);
    expect(res.body.issueKey).toBe(issueKey);
    expect(res.body.created).toBe(true);
    expect(res.body.taskName).toBe("Jira e2e issue");

    mockGetIssue.mockClear();
    mockGetIssue.mockResolvedValueOnce({
      id: "10001",
      key: issueKey,
      summary: "Jira e2e issue",
      projectKey: "PROJ"
    });
    const again = await authedAgent(app, memberSession)
      .get("/integrations/jira/resolve")
      .query({ issueKey });
    expect(again.status).toBe(200);
    expect(again.body.created).toBe(false);
    expect(again.body.taskName).toBe("Jira e2e issue");
    expect(mockGetIssue).toHaveBeenCalledTimes(1);
  });
});
