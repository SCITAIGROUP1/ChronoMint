import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainException } from "../../../common/errors/domain.exception";
import { JiraAuthService } from "./jira-auth.service";

type JiraProject = {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls: Record<string, string>;
};

type JiraIssueField = {
  summary: string;
  status: { name: string };
  issuetype: { name: string };
  priority?: { name: string };
  assignee?: { accountId: string; emailAddress: string; displayName: string };
  customfield_10016?: number; // story points
  customfield_10020?: Array<{ id: number; name: string; state: string }>; // sprint
  labels: string[];
  duedate?: string;
  description?: unknown;
};

export type JiraApiIssue = { id: string; key: string; fields: JiraIssueField };

type JiraUser = {
  accountId: string;
  emailAddress: string;
  displayName: string;
  active: boolean;
  avatarUrls?: Record<string, string>;
};

@Injectable()
export class JiraApiService {
  constructor(private auth: JiraAuthService) {}

  private baseUrl(cloudId: string) {
    return `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
  }

  private async req<T>(workspaceId: string, path: string, init: RequestInit = {}): Promise<T> {
    const { token, cloudId } = await this.auth.getValidToken(workspaceId);
    const url = `${this.baseUrl(cloudId)}${path}`;

    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...((init.headers as Record<string, string>) ?? {})
      }
    });

    if (res.status === 401) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Jira token is invalid or expired",
        HttpStatus.UNAUTHORIZED
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        `Jira API error (${res.status}): ${body}`,
        HttpStatus.BAD_GATEWAY
      );
    }

    return res.json() as Promise<T>;
  }

  async getProjects(workspaceId: string): Promise<JiraProject[]> {
    const data = await this.req<{ values: JiraProject[] }>(
      workspaceId,
      "/project/search?maxResults=100&orderBy=name"
    );
    return data.values;
  }

  async getIssues(
    workspaceId: string,
    opts: {
      projectKey?: string;
      assigneeAccountId?: string;
      sprintState?: "active" | "future";
      status?: string;
      search?: string;
      maxResults?: number;
      nextPageToken?: string;
    } = {}
  ) {
    const jql: string[] = [];
    if (opts.projectKey) jql.push(`project = "${opts.projectKey}"`);
    if (opts.assigneeAccountId) jql.push(`assignee = "${opts.assigneeAccountId}"`);
    if (opts.sprintState === "active") jql.push("sprint in openSprints()");
    if (opts.status) jql.push(`status = "${opts.status}"`);
    if (opts.search) jql.push(`text ~ "${opts.search}"`);

    const body: Record<string, unknown> = {
      jql: jql.length ? jql.join(" AND ") : "ORDER BY updated DESC",
      maxResults: opts.maxResults ?? 50,
      fields: [
        "summary",
        "status",
        "issuetype",
        "priority",
        "assignee",
        "customfield_10016",
        "customfield_10020",
        "labels",
        "duedate"
      ]
    };
    if (opts.nextPageToken) body.nextPageToken = opts.nextPageToken;

    return this.req<{
      issues: JiraApiIssue[];
      total?: number;
      nextPageToken?: string;
    }>(workspaceId, `/search/jql`, { method: "POST", body: JSON.stringify(body) });
  }

  async getUsers(workspaceId: string): Promise<JiraUser[]> {
    return this.req<JiraUser[]>(workspaceId, "/users/search?maxResults=200&includeActive=true");
  }

  async getBoards(workspaceId: string, projectKey: string) {
    return this.req<{ values: Array<{ id: number; name: string; type: string }> }>(
      workspaceId,
      `/board?projectKeyOrId=${projectKey}`
    ).catch(() => ({ values: [] as Array<{ id: number; name: string; type: string }> }));
  }

  async getSprints(workspaceId: string, boardId: number, state = "active") {
    return this.req<{
      values: Array<{
        id: number;
        name: string;
        state: string;
        startDate?: string;
        endDate?: string;
      }>;
    }>(workspaceId, `/board/${boardId}/sprint?state=${state}`).catch(() => ({
      values: [] as Array<{
        id: number;
        name: string;
        state: string;
        startDate?: string;
        endDate?: string;
      }>
    }));
  }

  async addWorklog(
    workspaceId: string,
    issueKey: string,
    timeSpentSeconds: number,
    startedAt: Date,
    comment?: string
  ) {
    return this.req<{ id: string; timeSpentSeconds: number }>(
      workspaceId,
      `/issue/${issueKey}/worklog`,
      {
        method: "POST",
        body: JSON.stringify({
          timeSpentSeconds,
          started: startedAt.toISOString().replace(/\.\d{3}Z$/, ".000+0000"),
          ...(comment
            ? {
                comment: {
                  type: "doc",
                  version: 1,
                  content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }]
                }
              }
            : {})
        })
      }
    );
  }

  async deleteWorklog(workspaceId: string, issueKey: string, worklogId: string) {
    const { token, cloudId } = await this.auth.getValidToken(workspaceId);
    await fetch(`${this.baseUrl(cloudId)}/issue/${issueKey}/worklog/${worklogId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    return { ok: true };
  }
}
