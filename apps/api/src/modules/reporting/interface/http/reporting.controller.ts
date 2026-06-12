import {
  myWeekQuerySchema,
  reportQuerySchema,
  utilizationQuerySchema,
  type UtilizationQueryDto,
  ROUTES
} from "@kloqra/contracts";
import { Controller, Get, Query, Param, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { ReportingService } from "../../application/reporting.service";
import { ProjectAccessService } from "../../../../common/access/project-access.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
  constructor(private reporting: ReportingService, private access: ProjectAccessService) {}

  @Roles("ADMIN", "CLIENT")
  @Get(ROUTES.REPORTING.DASHBOARD)
  async dashboard(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const q = query as Parameters<ReportingService["dashboard"]>[1];
    if (user.role === "CLIENT") {
      const projectIds = await this.access.accessibleProjectIds(user.workspaceId, user.userId, user.role);
      if (projectIds.length === 0) return this.reporting.dashboard(user.workspaceId, q, []);
      return this.reporting.dashboard(user.workspaceId, q, projectIds);
    }
    return this.reporting.dashboard(user.workspaceId, q);
  }

  @Roles("ADMIN", "CLIENT")
  @Get(ROUTES.REPORTING.UTILIZATION)
  async utilization(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(utilizationQuerySchema)) query: UtilizationQueryDto
  ) {
    if (user.role === "CLIENT") {
      return this.reporting.utilization(user.workspaceId, { ...query }, await this.access.accessibleProjectIds(user.workspaceId, user.userId, user.role));
    }
    return this.reporting.utilization(user.workspaceId, query);
  }

  @Roles("ADMIN", "CLIENT")
  @Get(ROUTES.REPORTING.BUDGET(":id"))
  budgetBurnDown(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.reporting.budgetBurnDown(user.workspaceId, id);
  }

  @Roles("ADMIN", "CLIENT")
  @Get(ROUTES.REPORTING.HEATMAP)
  async heatmap(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const q = query as Parameters<ReportingService["heatmap"]>[1];
    if (user.role === "CLIENT") {
      const projectIds = await this.access.accessibleProjectIds(user.workspaceId, user.userId, user.role);
      return this.reporting.heatmap(user.workspaceId, q, projectIds);
    }
    return this.reporting.heatmap(user.workspaceId, q);
  }

  @Roles("ADMIN", "CLIENT")
  @Get(ROUTES.REPORTING.CATEGORIES_HEATMAP)
  async categoriesHeatmap(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const q = query as Parameters<ReportingService["categoryProjectHeatmap"]>[1];
    if (user.role === "CLIENT") {
      const projectIds = await this.access.accessibleProjectIds(user.workspaceId, user.userId, user.role);
      return this.reporting.categoryProjectHeatmap(user.workspaceId, q, projectIds);
    }
    return this.reporting.categoryProjectHeatmap(user.workspaceId, q);
  }

  @Roles("ADMIN", "CLIENT")
  @Get(ROUTES.REPORTING.TASKS)
  async tasks(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(reportQuerySchema)) query: unknown
  ) {
    const q = query as Parameters<ReportingService["tasks"]>[1];
    if (user.role === "CLIENT") {
      const projectIds = await this.access.accessibleProjectIds(user.workspaceId, user.userId, user.role);
      return this.reporting.tasks(user.workspaceId, q, projectIds);
    }
    return this.reporting.tasks(user.workspaceId, q);
  }

  @Roles("ADMIN", "MEMBER")
  @Get(ROUTES.REPORTING.ME)
  myWeek(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(myWeekQuerySchema)) query: unknown
  ) {
    return this.reporting.myWeekSummary(
      user.workspaceId,
      user.userId,
      query as Parameters<ReportingService["myWeekSummary"]>[2]
    );
  }
}
