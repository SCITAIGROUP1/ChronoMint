import { ErrorCodes } from "@kloqra/contracts";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectAccessService } from "../../../../common/access/project-access.service";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { JiraApiClient } from "../infrastructure/jira-api.client";
import { JiraConnectionService } from "./jira-connection.service";
import { JiraIssueResolverService } from "./jira-issue-resolver.service";

describe("JiraIssueResolverService", () => {
  const workspaceId = "ws-1";
  const userId = "user-1";
  const projectId = "project-1";
  const categoryId = "cat-1";
  const taskId = "task-1";

  let prisma: {
    jiraIssueLink: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    jiraProjectMapping: { findUnique: ReturnType<typeof vi.fn> };
    task: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  };
  let connection: { getValidAccessToken: ReturnType<typeof vi.fn> };
  let jiraApi: { getIssue: ReturnType<typeof vi.fn> };
  let access: { assertCanAccessProject: ReturnType<typeof vi.fn> };
  let service: JiraIssueResolverService;

  beforeEach(() => {
    prisma = {
      jiraIssueLink: {
        findUnique: vi.fn(),
        create: vi.fn()
      },
      jiraProjectMapping: { findUnique: vi.fn() },
      task: { create: vi.fn(), update: vi.fn() }
    };
    connection = { getValidAccessToken: vi.fn() };
    jiraApi = { getIssue: vi.fn() };
    access = { assertCanAccessProject: vi.fn() };
    service = new JiraIssueResolverService(
      prisma as unknown as PrismaService,
      connection as unknown as JiraConnectionService,
      jiraApi as unknown as JiraApiClient,
      access as unknown as ProjectAccessService
    );
  });

  it("returns existing linked task and syncs renamed Jira summary", async () => {
    prisma.jiraIssueLink.findUnique.mockResolvedValue({
      jiraIssueId: "10001",
      task: { id: taskId, taskName: "Old title", projectId }
    });
    connection.getValidAccessToken.mockResolvedValue({
      accessToken: "token",
      cloudId: "cloud-1"
    });
    jiraApi.getIssue.mockResolvedValue({
      id: "10001",
      key: "PROJ-123",
      summary: "Updated Jira title",
      projectKey: "PROJ"
    });
    prisma.task.update.mockResolvedValue({
      id: taskId,
      taskName: "Updated Jira title",
      projectId
    });

    const result = await service.resolve(workspaceId, userId, "MEMBER", "PROJ-123");

    expect(result).toEqual({
      issueKey: "PROJ-123",
      jiraIssueId: "10001",
      taskId,
      taskName: "Updated Jira title",
      projectId,
      created: false
    });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: taskId },
      data: { taskName: "Updated Jira title" },
      select: { id: true, taskName: true, projectId: true }
    });
  });

  it("auto-creates task when mapping allows it", async () => {
    prisma.jiraIssueLink.findUnique.mockResolvedValue(null);
    prisma.jiraProjectMapping.findUnique.mockResolvedValue({
      chronomintProjectId: projectId,
      autoCreateTasks: true,
      defaultCategoryId: categoryId
    });
    connection.getValidAccessToken.mockResolvedValue({
      accessToken: "token",
      cloudId: "cloud-1"
    });
    jiraApi.getIssue.mockResolvedValue({
      id: "10001",
      key: "PROJ-123",
      summary: "Fix login bug",
      projectKey: "PROJ"
    });
    prisma.task.create.mockResolvedValue({
      id: taskId,
      projectId,
      taskName: "Fix login bug"
    });

    const result = await service.resolve(workspaceId, userId, "MEMBER", "PROJ-123");

    expect(result.created).toBe(true);
    expect(result.taskId).toBe(taskId);
    expect(prisma.jiraIssueLink.create).toHaveBeenCalledWith({
      data: {
        workspaceId,
        jiraIssueKey: "PROJ-123",
        jiraIssueId: "10001",
        taskId
      }
    });
  });

  it("returns existing link when concurrent create hits unique constraint", async () => {
    prisma.jiraIssueLink.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      jiraIssueId: "10001",
      taskId,
      task: { id: taskId, taskName: "Existing", projectId }
    });
    prisma.jiraProjectMapping.findUnique.mockResolvedValue({
      chronomintProjectId: projectId,
      autoCreateTasks: true,
      defaultCategoryId: categoryId
    });
    connection.getValidAccessToken.mockResolvedValue({
      accessToken: "token",
      cloudId: "cloud-1"
    });
    jiraApi.getIssue
      .mockResolvedValueOnce({
        id: "10001",
        key: "PROJ-123",
        summary: "Fix login bug",
        projectKey: "PROJ"
      })
      .mockResolvedValueOnce({
        id: "10001",
        key: "PROJ-123",
        summary: "Existing",
        projectKey: "PROJ"
      });
    prisma.task.create.mockResolvedValue({
      id: "task-duplicate",
      projectId,
      taskName: "Fix login bug"
    });
    prisma.jiraIssueLink.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test"
      })
    );

    const result = await service.resolve(workspaceId, userId, "MEMBER", "PROJ-123");

    expect(result.created).toBe(false);
    expect(result.taskId).toBe(taskId);
    expect(result.taskName).toBe("Existing");
  });

  it("throws when jira project is not mapped", async () => {
    prisma.jiraIssueLink.findUnique.mockResolvedValue(null);
    prisma.jiraProjectMapping.findUnique.mockResolvedValue(null);

    await expect(service.resolve(workspaceId, userId, "MEMBER", "PROJ-123")).rejects.toMatchObject({
      code: ErrorCodes.JIRA_PROJECT_NOT_MAPPED,
      getStatus: expect.any(Function)
    });
  });
});
