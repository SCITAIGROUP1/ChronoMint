import type { JiraResolveIssueDto } from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ProjectAccessService } from "../../../../common/access/project-access.service";
import { DomainException } from "../../../../common/errors/domain.exception";
import { integrationPrisma } from "../../../../common/prisma/integration-prisma";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { JiraApiClient } from "../infrastructure/jira-api.client";
import { JiraConnectionService } from "./jira-connection.service";

@Injectable()
export class JiraIssueResolverService {
  constructor(
    private prisma: PrismaService,
    private connection: JiraConnectionService,
    private jiraApi: JiraApiClient,
    private access: ProjectAccessService
  ) {}

  async resolve(
    workspaceId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
    issueKey: string
  ): Promise<JiraResolveIssueDto> {
    const db = integrationPrisma(this.prisma);
    const existing = await db.jiraIssueLink.findUnique({
      where: { workspaceId_jiraIssueKey: { workspaceId, jiraIssueKey: issueKey } },
      include: { task: { select: { id: true, taskName: true, projectId: true } } }
    });
    if (existing) {
      const linked = await this.resolveLinkedTask(existing);
      if (linked) {
        await this.access.assertCanAccessProject(workspaceId, userId, role, linked.projectId);
        const synced = await this.syncTaskNameFromJira(workspaceId, issueKey, linked);
        return {
          issueKey,
          jiraIssueId: existing.jiraIssueId,
          taskId: synced.id,
          taskName: synced.taskName,
          projectId: synced.projectId,
          created: false
        };
      }
    }

    const projectKey = issueKey.split("-")[0];
    if (!projectKey) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid Jira issue key",
        HttpStatus.BAD_REQUEST
      );
    }

    const mapping = await db.jiraProjectMapping.findUnique({
      where: { workspaceId_jiraProjectKey: { workspaceId, jiraProjectKey: projectKey } }
    });
    if (!mapping) {
      throw new DomainException(
        ErrorCodes.JIRA_PROJECT_NOT_MAPPED,
        `Jira project ${projectKey} is not mapped to a ChronoMint project`,
        HttpStatus.BAD_REQUEST
      );
    }

    await this.access.assertCanAccessProject(
      workspaceId,
      userId,
      role,
      mapping.chronomintProjectId
    );

    if (!mapping.autoCreateTasks) {
      throw new DomainException(
        ErrorCodes.JIRA_PROJECT_NOT_MAPPED,
        `No ChronoMint task linked to ${issueKey} and auto-create is disabled`,
        HttpStatus.BAD_REQUEST
      );
    }

    const { accessToken, cloudId } = await this.connection.getValidAccessToken(workspaceId);
    const issue = await this.jiraApi.getIssue(cloudId, accessToken, issueKey);
    if (!issue) {
      throw new DomainException(
        ErrorCodes.JIRA_ISSUE_NOT_FOUND,
        `Jira issue ${issueKey} was not found`,
        HttpStatus.NOT_FOUND
      );
    }

    const task = await this.prisma.task.create({
      data: {
        projectId: mapping.chronomintProjectId,
        categoryId: mapping.defaultCategoryId,
        taskName: issue.summary,
        billableDefault: true
      }
    });

    try {
      await db.jiraIssueLink.create({
        data: {
          workspaceId,
          jiraIssueKey: issue.key,
          jiraIssueId: issue.id,
          taskId: task.id
        }
      });
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }
      const raced = await db.jiraIssueLink.findUnique({
        where: { workspaceId_jiraIssueKey: { workspaceId, jiraIssueKey: issueKey } },
        include: { task: { select: { id: true, taskName: true, projectId: true } } }
      });
      if (raced) {
        const linked = await this.resolveLinkedTask(raced);
        if (linked) {
          await this.access.assertCanAccessProject(workspaceId, userId, role, linked.projectId);
          const synced = await this.syncTaskNameFromJira(workspaceId, issueKey, linked);
          return {
            issueKey: issue.key,
            jiraIssueId: raced.jiraIssueId,
            taskId: synced.id,
            taskName: synced.taskName,
            projectId: synced.projectId,
            created: false
          };
        }
      }
      throw error;
    }

    return {
      issueKey: issue.key,
      jiraIssueId: issue.id,
      taskId: task.id,
      taskName: task.taskName,
      projectId: task.projectId,
      created: true
    };
  }

  private async syncTaskNameFromJira(
    workspaceId: string,
    issueKey: string,
    task: { id: string; taskName: string; projectId: string }
  ): Promise<{ id: string; taskName: string; projectId: string }> {
    const { accessToken, cloudId } = await this.connection.getValidAccessToken(workspaceId);
    const issue = await this.jiraApi.getIssue(cloudId, accessToken, issueKey);
    if (!issue || issue.summary === task.taskName) {
      return task;
    }
    return this.prisma.task.update({
      where: { id: task.id },
      data: { taskName: issue.summary },
      select: { id: true, taskName: true, projectId: true }
    });
  }

  private async resolveLinkedTask(link: {
    taskId: string;
    task?: { id: string; taskName: string; projectId: string } | null;
  }): Promise<{ id: string; taskName: string; projectId: string } | null> {
    if (link.task) {
      return link.task;
    }
    return this.prisma.task.findUnique({
      where: { id: link.taskId },
      select: { id: true, taskName: true, projectId: true }
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}
