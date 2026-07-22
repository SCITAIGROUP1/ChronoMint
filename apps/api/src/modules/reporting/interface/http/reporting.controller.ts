import {
  myWeekQuerySchema,
  projectSummaryQuerySchema,
  reportQuerySchema,
  utilizationQuerySchema,
  createWidgetShareSchema,
  type UtilizationQueryDto,
  ROUTES
} from "@kloqra/contracts";
import { Controller, Get, Post, Query, Param, Body, UseGuards, HttpCode } from "@nestjs/common";
import { AuthorizationEnforcementService } from "../../../../common/access/authorization-enforcement.service";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { CommercialFeaturesGuard } from "../../../../common/guards/commercial-features.guard";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { appOrigin } from "../../../../common/mailer/app-origin.util";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { ReportingService } from "../../application/reporting.service";
import { WidgetShareService } from "../../application/widget-share.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportingController {
  constructor(
    private reporting: ReportingService,
    private widgetShares: WidgetShareService,
    private authorization: AuthorizationEnforcementService
  ) {}

  private async allowedProjectIds(user: WorkspaceRequestUser): Promise<string[] | undefined> {
    const workspaceDecision = await this.authorization.evaluate({
      principalId: user.userId,
      permission: "workspace:ReadReports",
      resource: { scope: "workspace", workspaceId: user.workspaceId }
    });
    if (workspaceDecision.allowed) return undefined;

    const decisions = await Promise.all(
      (user.managedProjectIds ?? []).map(async (projectId) => ({
        projectId,
        decision: await this.authorization.evaluate({
          principalId: user.userId,
          permission: "project:ReadReports",
          resource: { scope: "project", projectId, expectedWorkspaceId: user.workspaceId }
        })
      }))
    );
    const allowed = decisions
      .filter(({ decision }) => decision.allowed)
      .map(({ projectId }) => projectId);
    if (allowed.length === 0) {
      await this.authorization.assertAllowed({
        principalId: user.userId,
        permission: "workspace:ReadReports",
        resource: { scope: "workspace", workspaceId: user.workspaceId }
      });
    }
    return allowed;
  }

  @Get(ROUTES.REPORTING.DASHBOARD)
  async dashboard(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const projectIds = await this.allowedProjectIds(user);
    return this.reporting.dashboard(
      user.workspaceId,
      query as Parameters<ReportingService["dashboard"]>[1],
      projectIds
    );
  }

  @Get(ROUTES.REPORTING.UTILIZATION)
  async utilization(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(utilizationQuerySchema)) query: UtilizationQueryDto
  ) {
    const projectIds = await this.allowedProjectIds(user);
    return this.reporting.utilization(user.workspaceId, query, projectIds);
  }

  @UseGuards(CommercialFeaturesGuard)
  @Get(ROUTES.REPORTING.BUDGET(":id"))
  async budgetBurnDown(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    await this.authorization.assertAllowed({
      principalId: user.userId,
      permission: "project:ReadReports",
      resource: { scope: "project", projectId: id, expectedWorkspaceId: user.workspaceId }
    });
    return this.reporting.budgetBurnDown(user.workspaceId, id);
  }

  @Get(ROUTES.REPORTING.HEATMAP)
  async heatmap(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const projectIds = await this.allowedProjectIds(user);
    return this.reporting.heatmap(
      user.workspaceId,
      query as Parameters<ReportingService["heatmap"]>[1],
      projectIds
    );
  }

  @Get(ROUTES.REPORTING.CATEGORIES_HEATMAP)
  async categoriesHeatmap(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const projectIds = await this.allowedProjectIds(user);
    return this.reporting.categoryProjectHeatmap(
      user.workspaceId,
      query as Parameters<ReportingService["categoryProjectHeatmap"]>[1],
      projectIds
    );
  }

  @Get(ROUTES.REPORTING.TASKS)
  async tasks(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const projectIds = await this.allowedProjectIds(user);
    return this.reporting.tasks(
      user.workspaceId,
      query as Parameters<ReportingService["tasks"]>[1],
      projectIds
    );
  }

  @Get(ROUTES.REPORTING.PROJECT_SUMMARY(":projectId"))
  async projectSummary(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("projectId") projectId: string,
    @Query(new ZodValidationPipe(projectSummaryQuerySchema)) query: unknown
  ) {
    await this.authorization.assertAllowed({
      principalId: user.userId,
      permission: "project:ReadReports",
      resource: {
        scope: "project",
        projectId,
        expectedWorkspaceId: user.workspaceId
      }
    });
    return this.reporting.projectSummary(
      user.workspaceId,
      projectId,
      user.userId,
      user.role,
      query as Parameters<ReportingService["projectSummary"]>[4]
    );
  }

  @RequirePermission("personal:ManageTimelogs", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  @Get(ROUTES.REPORTING.ME)
  myWeek(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(myWeekQuerySchema)) query: unknown
  ) {
    return this.reporting.myWeekSummary(
      user.workspaceId,
      user.userId,
      query as Parameters<ReportingService["myWeekSummary"]>[2]
    );
  }

  @RequirePermission("workspace:ManageReportShares", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  @HttpCode(200)
  @Post(ROUTES.REPORTING.WIDGET_SHARES)
  createWidgetShare(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createWidgetShareSchema)) body: unknown
  ) {
    return this.widgetShares.create(
      user.workspaceId,
      user.userId,
      body as Parameters<WidgetShareService["create"]>[2],
      appOrigin()
    );
  }
}
