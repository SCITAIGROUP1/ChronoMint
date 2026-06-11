import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DomainException } from "../../../common/errors/domain.exception";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class JiraAuthService {
  private readonly clientId = process.env.JIRA_CLIENT_ID ?? "";
  private readonly clientSecret = process.env.JIRA_CLIENT_SECRET ?? "";
  private readonly redirectUri =
    process.env.JIRA_REDIRECT_URI ?? "http://localhost:3001/api/jira/auth/callback";
  private readonly scopes =
    process.env.JIRA_SCOPES ??
    "read:jira-work write:jira-work read:jira-user read:account offline_access";

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService
  ) {}

  getAuthUrl(workspaceId: string): { authUrl: string } {
    const state = this.jwt.sign({ workspaceId }, { expiresIn: "10m" });
    const params = new URLSearchParams({
      audience: "api.atlassian.com",
      client_id: this.clientId,
      scope: this.scopes,
      redirect_uri: this.redirectUri,
      state,
      response_type: "code",
      prompt: "consent"
    });
    return { authUrl: `https://auth.atlassian.com/authorize?${params.toString()}` };
  }

  async handleCallback(code: string, state: string): Promise<string> {
    let workspaceId: string;
    try {
      const payload = this.jwt.verify<{ workspaceId: string }>(state);
      workspaceId = payload.workspaceId;
    } catch {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "Invalid or expired OAuth state",
        HttpStatus.BAD_REQUEST
      );
    }

    const tokenRes = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      })
    });

    if (!tokenRes.ok) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Failed to exchange authorization code with Atlassian",
        HttpStatus.BAD_GATEWAY
      );
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    };

    const resourcesRes = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!resourcesRes.ok) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Failed to fetch accessible Jira resources",
        HttpStatus.BAD_GATEWAY
      );
    }

    const resources = (await resourcesRes.json()) as Array<{
      id: string;
      name: string;
      url: string;
    }>;

    if (resources.length === 0) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No accessible Jira sites found for this account",
        HttpStatus.BAD_REQUEST
      );
    }

    const resource = resources[0];
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const meRes = await fetch("https://api.atlassian.com/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const me = meRes.ok ? ((await meRes.json()) as { email: string }) : { email: "" };

    await this.prisma.jiraConnection.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        cloudId: resource.id,
        siteUrl: resource.url,
        siteName: resource.name,
        email: me.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        tokenExpiresAt,
        scopes: tokens.scope.split(" "),
        isActive: true
      },
      update: {
        cloudId: resource.id,
        siteUrl: resource.url,
        siteName: resource.name,
        email: me.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        tokenExpiresAt,
        scopes: tokens.scope.split(" "),
        isActive: true
      }
    });

    const adminUrl = process.env.PUBLIC_ADMIN_URL ?? "http://localhost:3002";
    return `${adminUrl}/jira/settings?connected=true`;
  }

  async refreshTokens(connectionId: string): Promise<string> {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { id: connectionId }
    });
    if (!connection) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Jira connection not found",
        HttpStatus.NOT_FOUND
      );
    }

    const res = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: connection.refreshToken
      })
    });

    if (!res.ok) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Failed to refresh Jira token",
        HttpStatus.BAD_GATEWAY
      );
    }

    const tokens = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await this.prisma.jiraConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        tokenExpiresAt
      }
    });

    return tokens.access_token;
  }

  async getValidToken(workspaceId: string): Promise<{ token: string; cloudId: string }> {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { workspaceId }
    });
    if (!connection || !connection.isActive) {
      throw new DomainException(
        ErrorCodes.NOT_FOUND,
        "Jira is not connected for this workspace",
        HttpStatus.NOT_FOUND
      );
    }

    const expiresIn5Min = new Date(Date.now() + 5 * 60 * 1000);
    if (connection.tokenExpiresAt < expiresIn5Min) {
      const newToken = await this.refreshTokens(connection.id);
      return { token: newToken, cloudId: connection.cloudId };
    }

    return { token: connection.accessToken, cloudId: connection.cloudId };
  }

  async disconnect(workspaceId: string): Promise<{ ok: boolean }> {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { workspaceId }
    });
    if (!connection) return { ok: true };

    try {
      await fetch("https://auth.atlassian.com/oauth/token/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          token: connection.accessToken
        })
      });
    } catch {
      // Best-effort revocation — still delete locally
    }

    await this.prisma.jiraConnection.delete({ where: { workspaceId } });
    return { ok: true };
  }

  async getStatus(workspaceId: string) {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { workspaceId },
      select: {
        siteUrl: true,
        siteName: true,
        email: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true
      }
    });

    if (!connection) return { connected: false };

    return {
      connected: true,
      siteUrl: connection.siteUrl,
      siteName: connection.siteName,
      email: connection.email,
      isActive: connection.isActive,
      lastSyncAt: connection.lastSyncAt,
      connectedAt: connection.createdAt
    };
  }
}
