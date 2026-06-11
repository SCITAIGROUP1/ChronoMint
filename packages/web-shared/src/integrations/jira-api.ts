import type {
  CreatePersonalAccessTokenDto,
  CreatePersonalAccessTokenResponseDto,
  JiraConnectionStatusDto,
  JiraProjectMappingDto,
  JiraResolveIssueDto,
  PersonalAccessTokenDto,
  UpsertJiraProjectMappingsDto
} from "@kloqra/contracts";
import { ROUTES } from "@kloqra/contracts";
import { api } from "../api/client";

export async function fetchJiraConnectionStatus(
  workspaceId: string
): Promise<JiraConnectionStatusDto> {
  return api<JiraConnectionStatusDto>(ROUTES.INTEGRATIONS.JIRA.STATUS, { workspaceId });
}

export async function fetchJiraConnectUrl(workspaceId: string): Promise<{ url: string }> {
  return api<{ url: string }>(ROUTES.INTEGRATIONS.JIRA.CONNECT_URL, { workspaceId });
}

export async function disconnectJira(workspaceId: string): Promise<{ ok: true }> {
  return api<{ ok: true }>(ROUTES.INTEGRATIONS.JIRA.DISCONNECT, {
    method: "DELETE",
    workspaceId
  });
}

export async function fetchJiraProjectMappings(
  workspaceId: string
): Promise<JiraProjectMappingDto[]> {
  return api<JiraProjectMappingDto[]>(ROUTES.INTEGRATIONS.JIRA.PROJECT_MAPPINGS, { workspaceId });
}

export async function saveJiraProjectMappings(
  workspaceId: string,
  body: UpsertJiraProjectMappingsDto
): Promise<JiraProjectMappingDto[]> {
  return api<JiraProjectMappingDto[]>(ROUTES.INTEGRATIONS.JIRA.PROJECT_MAPPINGS, {
    method: "PUT",
    workspaceId,
    body: JSON.stringify(body)
  });
}

export async function resolveJiraIssue(
  workspaceId: string,
  issueKey: string
): Promise<JiraResolveIssueDto> {
  const params = new URLSearchParams({ issueKey });
  return api<JiraResolveIssueDto>(`${ROUTES.INTEGRATIONS.JIRA.RESOLVE}?${params}`, {
    workspaceId
  });
}

export async function listPersonalAccessTokens(
  workspaceId: string
): Promise<PersonalAccessTokenDto[]> {
  return api<PersonalAccessTokenDto[]>(ROUTES.AUTH.PERSONAL_TOKENS, { workspaceId });
}

export async function createPersonalAccessToken(
  workspaceId: string,
  body: CreatePersonalAccessTokenDto
): Promise<CreatePersonalAccessTokenResponseDto> {
  return api<CreatePersonalAccessTokenResponseDto>(ROUTES.AUTH.PERSONAL_TOKENS, {
    method: "POST",
    workspaceId,
    body: JSON.stringify(body)
  });
}

export async function revokePersonalAccessToken(
  workspaceId: string,
  tokenId: string
): Promise<{ ok: true }> {
  return api<{ ok: true }>(ROUTES.AUTH.PERSONAL_TOKEN(tokenId), {
    method: "DELETE",
    workspaceId
  });
}

/** Deep link members open from Jira automation or bookmarks. */
export function buildJiraTimerDeepLink(issueKey: string, clientOrigin?: string): string {
  const base =
    clientOrigin?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/timer?jiraIssue=${encodeURIComponent(issueKey)}`;
}
