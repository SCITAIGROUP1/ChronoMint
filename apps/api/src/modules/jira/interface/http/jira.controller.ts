import {
  listIssuesQuerySchema,
  listSyncLogsQuerySchema,
  setUserMappingSchema,
  upsertProjectMappingSchema,
  ROUTES
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Redirect,
  UseGuards
} from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { JiraAuthService } from "../../application/jira-auth.service";
import { JiraIssuesService } from "../../application/jira-issues.service";
import { JiraProjectsService } from "../../application/jira-projects.service";
import { JiraSyncLogService } from "../../application/jira-sync-log.service";
import { JiraUsersService } from "../../application/jira-users.service";
import { JiraWorklogsService } from "../../application/jira-worklogs.service";

@Controller()
export class JiraController {
  constructor(
    private auth: JiraAuthService,
    private projects: JiraProjectsService,
    private issues: JiraIssuesService,
    private users: JiraUsersService,
    private worklogs: JiraWorklogsService,
    private syncLogs: JiraSyncLogService
  ) {}

  // ── Auth ──────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get(ROUTES.JIRA.AUTH_STATUS)
  getStatus(@CurrentUser() user: RequestUser) {
    return this.auth.getStatus(user.workspaceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get(ROUTES.JIRA.AUTH_CONNECT)
  connect(@CurrentUser() user: RequestUser) {
    return this.auth.getAuthUrl(user.workspaceId);
  }

  // Public — called by Atlassian after user authorises the app
  @Get(ROUTES.JIRA.AUTH_CALLBACK)
  @Redirect()
  async callback(@Query("code") code: string, @Query("state") state: string) {
    const url = await this.auth.handleCallback(code, state);
    return { url, statusCode: 302 };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Delete(ROUTES.JIRA.AUTH_DISCONNECT)
  disconnect(@CurrentUser() user: RequestUser) {
    return this.auth.disconnect(user.workspaceId);
  }

  // ── Projects ──────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get(ROUTES.JIRA.PROJECTS)
  listProjects(@CurrentUser() user: RequestUser) {
    return this.projects.listJiraProjects(user.workspaceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get(ROUTES.JIRA.PROJECT_MAPPINGS)
  getMappings(@CurrentUser() user: RequestUser) {
    return this.projects.getMappings(user.workspaceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post(ROUTES.JIRA.PROJECT_MAPPINGS)
  upsertMapping(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(upsertProjectMappingSchema)) body: unknown
  ) {
    return this.projects.upsertMapping(
      user.workspaceId,
      body as Parameters<JiraProjectsService["upsertMapping"]>[1]
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Delete(ROUTES.JIRA.PROJECT_MAPPING(":id"))
  deleteMapping(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.projects.deleteMapping(user.workspaceId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post(ROUTES.JIRA.PROJECTS_SYNC)
  syncIssues(@CurrentUser() user: RequestUser, @Query("projectKey") projectKey?: string) {
    return this.issues.syncIssues(user.workspaceId, projectKey);
  }

  // ── Issues ────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get(ROUTES.JIRA.ISSUES)
  listIssues(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listIssuesQuerySchema)) query: unknown
  ) {
    return this.issues.listCachedIssues(
      user.workspaceId,
      query as Parameters<JiraIssuesService["listCachedIssues"]>[1]
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(ROUTES.JIRA.MY_ISSUES)
  getMyIssues(@CurrentUser() user: RequestUser) {
    return this.issues.getMyIssues(user.workspaceId, user.userId);
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get(ROUTES.JIRA.USERS)
  listJiraUsers(@CurrentUser() user: RequestUser) {
    return this.users.listJiraUsers(user.workspaceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get(ROUTES.JIRA.USER_MAPPINGS)
  getUserMappings(@CurrentUser() user: RequestUser) {
    return this.users.getMappings(user.workspaceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post(ROUTES.JIRA.USERS_AUTO_MAP)
  autoMap(@CurrentUser() user: RequestUser) {
    return this.users.autoMap(user.workspaceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post(ROUTES.JIRA.USER_MAPPINGS)
  setMapping(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(setUserMappingSchema)) body: unknown
  ) {
    return this.users.setMapping(
      user.workspaceId,
      body as Parameters<JiraUsersService["setMapping"]>[1]
    );
  }

  // ── Worklogs ──────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get(ROUTES.JIRA.WORKLOGS)
  listWorklogs(
    @CurrentUser() user: RequestUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.worklogs.listSyncStatus(
      user.workspaceId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 25
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Post(ROUTES.JIRA.WORKLOGS_SYNC)
  syncWorklogs(@CurrentUser() user: RequestUser) {
    return this.worklogs.syncPending(user.workspaceId);
  }

  // ── Logs ──────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @Get(ROUTES.JIRA.LOGS)
  getLogs(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listSyncLogsQuerySchema)) query: unknown
  ) {
    return this.syncLogs.list(user.workspaceId, query as Parameters<JiraSyncLogService["list"]>[1]);
  }
}
