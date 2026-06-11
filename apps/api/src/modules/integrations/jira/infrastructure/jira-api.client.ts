import { Injectable } from "@nestjs/common";

export interface JiraAccessibleResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
}

export interface JiraIssueSummary {
  id: string;
  key: string;
  summary: string;
  projectKey: string;
}

export interface JiraOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class JiraApiClient {
  async exchangeAuthorizationCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<JiraOAuthTokens> {
    const res = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Jira token exchange failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    };
  }

  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<JiraOAuthTokens> {
    const res = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      })
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Jira token refresh failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    };
  }

  async listAccessibleResources(accessToken: string): Promise<JiraAccessibleResource[]> {
    const res = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Jira accessible resources failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as Array<{
      id: string;
      url: string;
      name: string;
      scopes: string[];
    }>;
    return data.map((item) => ({
      id: item.id,
      url: item.url,
      name: item.name,
      scopes: item.scopes
    }));
  }

  async getIssue(
    cloudId: string,
    accessToken: string,
    issueKey: string
  ): Promise<JiraIssueSummary | null> {
    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,project`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json"
        }
      }
    );
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Jira get issue failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as {
      id: string;
      key: string;
      fields: { summary: string; project: { key: string } };
    };
    return {
      id: data.id,
      key: data.key,
      summary: data.fields.summary,
      projectKey: data.fields.project.key
    };
  }
}
