import {
  assignWorkspaceAdminSchema,
  createTenantWorkspaceSchema,
  inviteTenantMemberSchema,
  ROUTES,
  tenantAnalyticsQuerySchema,
  updateTenantMemberSchema,
  updateTenantCurrentSchema,
  type AssignWorkspaceAdminDto,
  type CreateTenantWorkspaceDto,
  type InviteTenantMemberDto,
  type TenantAnalyticsQueryDto,
  type UpdateTenantCurrentDto,
  type UpdateTenantMemberDto
} from "@kloqra/contracts";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { TenantRoles } from "../../../../common/decorators/tenant-roles.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { TenantRolesGuard } from "../../../../common/guards/tenant-roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
/* eslint-disable no-restricted-imports -- TenantsModule imports WorkspaceModule */
import { SubscriptionsService } from "../../../subscriptions/application/subscriptions.service";
import { WorkspaceService } from "../../../workspace/application/workspace.service";
/* eslint-enable no-restricted-imports */
import { TenantAnalyticsService } from "../../application/tenant-analytics.service";
import { TenantsService } from "../../application/tenants.service";

@Controller()
@UseGuards(JwtAuthGuard, TenantRolesGuard)
export class TenantsController {
  constructor(
    private tenants: TenantsService,
    private tenantAnalytics: TenantAnalyticsService,
    private workspace: WorkspaceService,
    private subscriptions: SubscriptionsService
  ) {}

  @Get(ROUTES.TENANTS.CURRENT)
  getCurrent(@CurrentUser() user: RequestUser) {
    return this.tenants.getCurrent(user.userId, user.tenantId);
  }

  @TenantRoles("OWNER")
  @Patch(ROUTES.TENANTS.CURRENT)
  updateCurrent(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateTenantCurrentSchema)) body: UpdateTenantCurrentDto
  ) {
    return this.tenants.updateCurrent(user.userId, user.tenantId, body);
  }

  @TenantRoles("OWNER")
  @Get(ROUTES.TENANTS.OVERVIEW)
  getOverview(@CurrentUser() user: RequestUser) {
    return this.tenants.getOverview(user.userId, user.tenantId);
  }

  @TenantRoles("OWNER")
  @Get(ROUTES.TENANTS.ANALYTICS_SUMMARY)
  getAnalyticsSummary(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(tenantAnalyticsQuerySchema)) query: TenantAnalyticsQueryDto
  ) {
    return this.tenantAnalytics.getSummary(user.userId, user.tenantId, query);
  }

  @TenantRoles("OWNER")
  @Get(ROUTES.TENANTS.SUBSCRIPTION)
  getSubscription(@CurrentUser() user: RequestUser) {
    return this.subscriptions.getSubscriptionForTenant(user.tenantId);
  }

  @TenantRoles("OWNER", "ADMIN")
  @Get(ROUTES.TENANTS.MEMBERS)
  listMembers(@CurrentUser() user: RequestUser) {
    return this.tenants.listMembers(user.userId, user.tenantId);
  }

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.MEMBERS)
  inviteMember(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(inviteTenantMemberSchema)) body: InviteTenantMemberDto
  ) {
    return this.tenants.inviteMember(user.userId, user.tenantId, body);
  }

  @TenantRoles("OWNER")
  @Patch(ROUTES.TENANTS.MEMBER(":id"))
  updateMember(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTenantMemberSchema)) body: UpdateTenantMemberDto
  ) {
    return this.tenants.updateMember(user.userId, user.tenantId, id, body);
  }

  @TenantRoles("OWNER")
  @Post(ROUTES.TENANTS.WORKSPACES)
  createWorkspace(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createTenantWorkspaceSchema)) body: CreateTenantWorkspaceDto
  ) {
    return this.workspace.create(user.userId, body);
  }

  @TenantRoles("OWNER")
  @Post(ROUTES.WORKSPACES.ASSIGN_ADMIN(":workspaceId"))
  assignWorkspaceAdmin(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(assignWorkspaceAdminSchema)) body: AssignWorkspaceAdminDto
  ) {
    return this.workspace.assignAdminAsTenantOwner(user.userId, user.tenantId, workspaceId, body);
  }
}
