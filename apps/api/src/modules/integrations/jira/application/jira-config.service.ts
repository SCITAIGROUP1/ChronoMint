import { Injectable } from "@nestjs/common";

@Injectable()
export class JiraConfigService {
  isConfigured(): boolean {
    return Boolean(
      process.env.ATLASSIAN_CLIENT_ID?.trim() &&
      process.env.ATLASSIAN_CLIENT_SECRET?.trim() &&
      process.env.ATLASSIAN_REDIRECT_URI?.trim()
    );
  }

  get clientId(): string {
    return process.env.ATLASSIAN_CLIENT_ID?.trim() ?? "";
  }

  get clientSecret(): string {
    return process.env.ATLASSIAN_CLIENT_SECRET?.trim() ?? "";
  }

  get redirectUri(): string {
    return process.env.ATLASSIAN_REDIRECT_URI?.trim() ?? "";
  }

  get scopes(): string[] {
    return ["read:jira-work", "read:jira-user", "offline_access"];
  }

  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      audience: "api.atlassian.com",
      client_id: this.clientId,
      scope: this.scopes.join(" "),
      redirect_uri: this.redirectUri,
      state,
      response_type: "code",
      prompt: "consent"
    });
    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }
}
