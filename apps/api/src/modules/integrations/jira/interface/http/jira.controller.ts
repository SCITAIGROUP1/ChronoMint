import {
  resolveJiraIssueQuerySchema,
  ROUTES,
  upsertJiraProjectMappingsSchema,
  type ResolveJiraIssueQuery,
  type UpsertJiraProjectMappingsDto
} from "@kloqra/contracts";
import { Body, Controller, Delete, Get, Put, Query, Res, UseGuards } from "@nestjs/common";
import { type Response } from "express";
import {
  CurrentUser,
  type RequestUser
} from "../../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../../common/guards/jwt-auth.guard";
import { JwtOrPatAuthGuard } from "../../../../../common/guards/jwt-or-pat-auth.guard";
import { RolesGuard } from "../../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../../common/pipes/zod-validation.pipe";
import { JiraConnectionService } from "../../application/jira-connection.service";
import { JiraIssueResolverService } from "../../application/jira-issue-resolver.service";
import { JiraProjectMappingService } from "../../application/jira-project-mapping.service";

function adminSettingsUrl(suffix: string): string {
  const explicit = process.env.PUBLIC_ADMIN_URL?.trim();
  if (explicit) return `${explicit.replace(/\/$/, "")}${suffix}`;
  const origins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3002")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const adminOrigin =
    origins.find((o) => o.includes(":3002")) ??
    origins[origins.length - 1] ??
    "http://localhost:3002";
  return `${adminOrigin.replace(/\/$/, "")}${suffix}`;
}

@Controller()
export class JiraController {
  constructor(
    private connection: JiraConnectionService,
    private mappings: JiraProjectMappingService,
    private resolver: JiraIssueResolverService
  ) {}

  @Get(ROUTES.INTEGRATIONS.JIRA.STATUS)
  @UseGuards(JwtAuthGuard, RolesGuard)
  status(@CurrentUser() user: RequestUser) {
    return this.connection.getStatus(user.workspaceId);
  }

  @Get(ROUTES.INTEGRATIONS.JIRA.CONNECT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  connect(@CurrentUser() user: RequestUser, @Res() res: Response) {
    const url = this.connection.buildConnectRedirectUrl(user.workspaceId, user.userId);
    return res.redirect(url);
  }

  @Get(ROUTES.INTEGRATIONS.JIRA.CONNECT_URL)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  connectUrl(@CurrentUser() user: RequestUser) {
    return {
      url: this.connection.buildConnectRedirectUrl(user.workspaceId, user.userId)
    };
  }

  @Get(ROUTES.INTEGRATIONS.JIRA.CALLBACK)
  async callback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response
  ) {
    if (error || !code || !state) {
      return res.redirect(adminSettingsUrl("/settings?jira=error"));
    }
    try {
      await this.connection.handleCallback(code, state);
      return res.redirect(adminSettingsUrl("/settings?jira=connected"));
    } catch {
      return res.redirect(adminSettingsUrl("/settings?jira=error"));
    }
  }

  @Delete(ROUTES.INTEGRATIONS.JIRA.DISCONNECT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  disconnect(@CurrentUser() user: RequestUser) {
    return this.connection.disconnect(user.workspaceId);
  }

  @Get(ROUTES.INTEGRATIONS.JIRA.PROJECT_MAPPINGS)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  listMappings(@CurrentUser() user: RequestUser) {
    return this.mappings.list(user.workspaceId);
  }

  @Put(ROUTES.INTEGRATIONS.JIRA.PROJECT_MAPPINGS)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  upsertMappings(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(upsertJiraProjectMappingsSchema)) body: UpsertJiraProjectMappingsDto
  ) {
    return this.mappings.upsertMany(user.workspaceId, body);
  }

  @Get(ROUTES.INTEGRATIONS.JIRA.RESOLVE)
  @UseGuards(JwtOrPatAuthGuard)
  resolve(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(resolveJiraIssueQuerySchema)) query: ResolveJiraIssueQuery
  ) {
    return this.resolver.resolve(user.workspaceId, user.userId, user.role, query.issueKey);
  }
}
