import type { JiraConnectionStatusDto } from "@kloqra/contracts";
import { ErrorCodes } from "@kloqra/contracts";
import { HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TokenCipherService } from "../../../../common/crypto/token-cipher.service";
import { DomainException } from "../../../../common/errors/domain.exception";
import { integrationPrisma } from "../../../../common/prisma/integration-prisma";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { JiraApiClient } from "../infrastructure/jira-api.client";
import { JiraConfigService } from "./jira-config.service";

type OAuthStatePayload = {
  typ: "jira_oauth_state";
  workspaceId: string;
  userId: string;
};

@Injectable()
export class JiraConnectionService {
  constructor(
    private prisma: PrismaService,
    private config: JiraConfigService,
    private jiraApi: JiraApiClient,
    private cipher: TokenCipherService,
    private jwt: JwtService
  ) {}

  async getStatus(workspaceId: string): Promise<JiraConnectionStatusDto> {
    const configured = this.config.isConfigured();
    const row = await integrationPrisma(this.prisma).jiraConnection.findUnique({
      where: { workspaceId }
    });
    if (!row) {
      return { connected: false, configured };
    }
    return {
      connected: true,
      configured,
      siteUrl: row.siteUrl,
      connectedAt: row.createdAt.toISOString()
    };
  }

  assertConfigured(): void {
    if (!this.config.isConfigured()) {
      throw new DomainException(
        ErrorCodes.JIRA_NOT_CONFIGURED,
        "Jira integration is not configured on this server",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  createConnectState(workspaceId: string, userId: string): string {
    this.assertConfigured();
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) {
      throw new DomainException(
        ErrorCodes.JIRA_NOT_CONFIGURED,
        "Auth not configured",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    return this.jwt.sign(
      { typ: "jira_oauth_state", workspaceId, userId } satisfies OAuthStatePayload,
      { secret, expiresIn: "10m" }
    );
  }

  buildConnectRedirectUrl(workspaceId: string, userId: string): string {
    const state = this.createConnectState(workspaceId, userId);
    return this.config.buildAuthorizeUrl(state);
  }

  verifyConnectState(state: string): OAuthStatePayload {
    const secret = process.env.JWT_ACCESS_SECRET?.trim();
    if (!secret) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid OAuth state",
        HttpStatus.BAD_REQUEST
      );
    }
    try {
      const payload = this.jwt.verify(state, { secret }) as OAuthStatePayload;
      if (payload.typ !== "jira_oauth_state") {
        throw new Error("wrong type");
      }
      return payload;
    } catch {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid or expired OAuth state",
        HttpStatus.BAD_REQUEST
      );
    }
  }

  async handleCallback(code: string, state: string): Promise<{ workspaceId: string }> {
    this.assertConfigured();
    const { workspaceId, userId } = this.verifyConnectState(state);
    const tokens = await this.jiraApi.exchangeAuthorizationCode(
      code,
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );
    const resources = await this.jiraApi.listAccessibleResources(tokens.accessToken);
    const resource = resources[0];
    if (!resource) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No accessible Jira sites found for this account",
        HttpStatus.BAD_REQUEST
      );
    }
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    await integrationPrisma(this.prisma).jiraConnection.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        cloudId: resource.id,
        siteUrl: resource.url,
        accessToken: this.cipher.encrypt(tokens.accessToken),
        refreshToken: this.cipher.encrypt(tokens.refreshToken),
        expiresAt,
        connectedById: userId
      },
      update: {
        cloudId: resource.id,
        siteUrl: resource.url,
        accessToken: this.cipher.encrypt(tokens.accessToken),
        refreshToken: this.cipher.encrypt(tokens.refreshToken),
        expiresAt,
        connectedById: userId
      }
    });
    return { workspaceId };
  }

  async disconnect(workspaceId: string): Promise<{ ok: true }> {
    await integrationPrisma(this.prisma).jiraConnection.deleteMany({ where: { workspaceId } });
    return { ok: true };
  }

  async getValidAccessToken(
    workspaceId: string
  ): Promise<{ accessToken: string; cloudId: string }> {
    const row = await integrationPrisma(this.prisma).jiraConnection.findUnique({
      where: { workspaceId }
    });
    if (!row) {
      throw new DomainException(
        ErrorCodes.JIRA_NOT_CONNECTED,
        "Jira is not connected for this workspace",
        HttpStatus.BAD_REQUEST
      );
    }
    if (row.expiresAt.getTime() > Date.now() + 60_000) {
      return {
        accessToken: this.cipher.decrypt(row.accessToken),
        cloudId: row.cloudId
      };
    }
    const refreshToken = this.cipher.decrypt(row.refreshToken);
    const tokens = await this.jiraApi.refreshAccessToken(
      refreshToken,
      this.config.clientId,
      this.config.clientSecret
    );
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    await integrationPrisma(this.prisma).jiraConnection.update({
      where: { workspaceId },
      data: {
        accessToken: this.cipher.encrypt(tokens.accessToken),
        refreshToken: this.cipher.encrypt(tokens.refreshToken),
        expiresAt
      }
    });
    return { accessToken: tokens.accessToken, cloudId: row.cloudId };
  }
}
