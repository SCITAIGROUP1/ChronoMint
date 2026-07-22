import {
  assignWorkspaceAdminSchema,
  createTenantWorkspaceSchema,
  inviteTenantMemberSchema,
  batchPolicyMutationSchema,
  managedRoleSchema,
  policyDirectoryQuerySchema,
  resetPolicySchema,
  ROUTES,
  roleGrantAuditQuerySchema,
  tenantAnalyticsQuerySchema,
  updatePermissionMatrixPolicySchema,
  updateMemberPermissionSchema,
  updateTenantMemberSchema,
  updateTenantCurrentSchema,
  updateWorkspaceMemberSchema,
  workspaceAdminsOverviewQuerySchema,
  type AssignWorkspaceAdminDto,
  type CreateTenantWorkspaceDto,
  type InviteTenantMemberDto,
  type BatchPolicyMutationDto,
  type ManagedRole,
  type PolicyDirectoryQueryDto,
  type ResetPolicyDto,
  type RoleGrantAuditQuery,
  type TenantAnalyticsQueryDto,
  type UpdatePermissionMatrixPolicyDto,
  type UpdateMemberPermissionDto,
  type UpdateTenantCurrentDto,
  type UpdateTenantMemberDto,
  type UpdateWorkspaceMemberDto,
  type WorkspaceAdminsOverviewQuery
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { TenantScoped } from "../../../../common/decorators/tenant-scoped.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
/* eslint-disable no-restricted-imports -- TenantsModule imports WorkspaceModule */
import { SubscriptionsService } from "../../../subscriptions/application/subscriptions.service";
import { WorkspaceService } from "../../../workspace/application/workspace.service";
/* eslint-enable no-restricted-imports */
import { PermissionMatrixService } from "../../application/permission-matrix.service";
import { RoleGrantAuditLogService } from "../../application/role-grant-audit-log.service";
import { TenantAnalyticsService } from "../../application/tenant-analytics.service";
import { TenantWorkspaceAdminsOverviewService } from "../../application/tenant-workspace-admins-overview.service";
import { TenantsService } from "../../application/tenants.service";

@Controller()
@TenantScoped()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TenantsController {
  constructor(
    private tenants: TenantsService,
    private tenantAnalytics: TenantAnalyticsService,
    private workspaceAdminsOverviewService: TenantWorkspaceAdminsOverviewService,
    private workspace: WorkspaceService,
    private subscriptions: SubscriptionsService,
    private roleGrantAuditLog: RoleGrantAuditLogService,
    private permissionMatrix: PermissionMatrixService
  ) {}

  @Get(ROUTES.TENANTS.CURRENT)
  @RequirePermission("tenant:ReadOrganization", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getCurrent(@CurrentUser() user: RequestUser) {
    return this.tenants.getCurrent(user.userId, user.tenantId);
  }

  @Patch(ROUTES.TENANTS.CURRENT)
  @RequirePermission("tenant:UpdateOrganization", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  updateCurrent(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateTenantCurrentSchema)) body: UpdateTenantCurrentDto
  ) {
    return this.tenants.updateCurrent(user.userId, user.tenantId, body);
  }

  @Get(ROUTES.TENANTS.OVERVIEW)
  @RequirePermission("tenant:ReadAnalytics", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getOverview(@CurrentUser() user: RequestUser) {
    return this.tenants.getOverview(user.userId, user.tenantId);
  }

  @Get(ROUTES.TENANTS.ANALYTICS_SUMMARY)
  @RequirePermission("tenant:ReadAnalytics", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getAnalyticsSummary(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(tenantAnalyticsQuerySchema)) query: TenantAnalyticsQueryDto
  ) {
    return this.tenantAnalytics.getSummary(user.userId, user.tenantId, query);
  }

  @Get(ROUTES.TENANTS.SUBSCRIPTION)
  @RequirePermission("tenant:ReadBilling", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getSubscription(@CurrentUser() user: RequestUser) {
    return this.subscriptions.getSubscriptionForTenant(user.tenantId);
  }

  @Get(ROUTES.TENANTS.MEMBERS)
  @RequirePermission("tenant:ListMembers", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  listMembers(@CurrentUser() user: RequestUser) {
    return this.tenants.listMembers(user.userId, user.tenantId);
  }

  @Post(ROUTES.TENANTS.MEMBERS)
  @RequirePermission("tenant:ManageMembers", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  inviteMember(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(inviteTenantMemberSchema)) body: InviteTenantMemberDto
  ) {
    return this.tenants.inviteMember(user.userId, user.tenantId, body);
  }

  @Patch(ROUTES.TENANTS.MEMBER(":id"))
  @RequirePermission("tenant:ManageMembers", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  updateMember(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTenantMemberSchema)) body: UpdateTenantMemberDto
  ) {
    return this.tenants.updateMember(user.userId, user.tenantId, id, body);
  }

  @Get(ROUTES.TENANTS.WORKSPACE_ADMINS_OVERVIEW)
  @RequirePermission("tenant:ManageWorkspaceAdmins", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  workspaceAdminsOverview(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(workspaceAdminsOverviewQuerySchema))
    query: WorkspaceAdminsOverviewQuery
  ) {
    return this.workspaceAdminsOverviewService.getOverview(user.tenantId, query);
  }

  @Get(ROUTES.TENANTS.WORKSPACES)
  @RequirePermission("tenant:ListWorkspaces", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  listWorkspaces(@CurrentUser() user: RequestUser) {
    return this.workspace.listForTenant(user.tenantId);
  }

  @Get(ROUTES.TENANTS.WORKSPACES_TREE)
  @RequirePermission("tenant:ListWorkspaces", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getWorkspacesTree(@CurrentUser() user: RequestUser) {
    return this.workspace.getWorkspacesTree(user.tenantId);
  }

  @Post(ROUTES.TENANTS.WORKSPACES)
  @RequirePermission("tenant:CreateWorkspace", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  createWorkspace(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createTenantWorkspaceSchema)) body: CreateTenantWorkspaceDto
  ) {
    return this.workspace.create(user.userId, body);
  }

  @Post(ROUTES.WORKSPACES.ASSIGN_ADMIN(":workspaceId"))
  @RequirePermission("tenant:ManageWorkspaceAdmins", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  assignWorkspaceAdmin(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(assignWorkspaceAdminSchema)) body: AssignWorkspaceAdminDto
  ) {
    return this.workspace.assignAdminAsTenantOwner(user.userId, user.tenantId, workspaceId, body);
  }

  @Patch(ROUTES.TENANTS.WORKSPACE_MEMBER(":workspaceId", ":memberId"))
  @RequirePermission("tenant:ManageWorkspaceAdmins", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  updateWorkspaceMember(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string,
    @Body(new ZodValidationPipe(updateWorkspaceMemberSchema)) body: UpdateWorkspaceMemberDto
  ) {
    return this.workspace.updateMemberAsTenantOperator(
      user.userId,
      user.tenantId,
      workspaceId,
      memberId,
      body
    );
  }

  @Delete(ROUTES.TENANTS.WORKSPACE_MEMBER(":workspaceId", ":memberId"))
  @RequirePermission("tenant:ManageWorkspaceAdmins", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  removeWorkspaceMember(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string
  ) {
    return this.workspace.removeMemberAsTenantOperator(
      user.userId,
      user.tenantId,
      workspaceId,
      memberId
    );
  }

  @Post(ROUTES.TENANTS.WORKSPACE_MEMBER_RESEND(":workspaceId", ":memberId"))
  @RequirePermission("tenant:ManageWorkspaceAdmins", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  resendWorkspaceMemberCredentials(
    @CurrentUser() user: RequestUser,
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string
  ) {
    return this.workspace.resendMemberCredentialsAsTenantOperator(
      user.userId,
      user.tenantId,
      workspaceId,
      memberId
    );
  }

  @Get(ROUTES.TENANTS.ROLE_GRANT_AUDIT)
  @RequirePermission("tenant:ReadPermissionAudit", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getRoleGrantAuditLog(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(roleGrantAuditQuerySchema)) query: RoleGrantAuditQuery
  ) {
    return this.roleGrantAuditLog.getTenantAuditLog(user.tenantId, query);
  }

  @Get(ROUTES.TENANTS.PERMISSION_POLICY_CATALOG)
  @RequirePermission("tenant:ReadPermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getPermissionPolicyCatalog() {
    return this.permissionMatrix.getCatalog();
  }

  @Get(ROUTES.TENANTS.ROLE_POLICIES)
  @RequirePermission("tenant:ReadPermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  listRolePolicies(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(policyDirectoryQuerySchema)) query: PolicyDirectoryQueryDto
  ) {
    return this.permissionMatrix.listRolePolicies(user.tenantId, query);
  }

  @Get(ROUTES.TENANTS.PRINCIPAL_POLICIES)
  @RequirePermission("tenant:ReadPermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  listPrincipalPolicies(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(policyDirectoryQuerySchema)) query: PolicyDirectoryQueryDto
  ) {
    return this.permissionMatrix.listPrincipalPolicies(user.tenantId, query);
  }

  @Get(ROUTES.TENANTS.ROLE_POLICY(":role"))
  @RequirePermission("tenant:ReadPermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getRolePolicy(
    @CurrentUser() user: RequestUser,
    @Param("role", new ZodValidationPipe(managedRoleSchema)) role: ManagedRole,
    @Query(new ZodValidationPipe(policyDirectoryQuerySchema)) query: PolicyDirectoryQueryDto
  ) {
    const target = this.requireExplicitPolicyTarget(query);
    return this.permissionMatrix.getRolePolicy(
      user.tenantId,
      role,
      target.scope,
      target.resourceId
    );
  }

  @Get(ROUTES.TENANTS.PRINCIPAL_POLICY(":principalId"))
  @RequirePermission("tenant:ReadPermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getPrincipalPolicy(
    @CurrentUser() user: RequestUser,
    @Param("principalId") principalId: string,
    @Query(new ZodValidationPipe(policyDirectoryQuerySchema)) query: PolicyDirectoryQueryDto
  ) {
    const target = this.requireExplicitPolicyTarget(query);
    return this.permissionMatrix.getPrincipalPolicy(
      user.tenantId,
      principalId,
      target.scope,
      target.resourceId
    );
  }

  @Patch(ROUTES.TENANTS.PERMISSION_POLICY_BATCH)
  @RequirePermission("tenant:ManagePermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  mutatePermissionPolicy(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(batchPolicyMutationSchema)) body: BatchPolicyMutationDto
  ) {
    return this.permissionMatrix.mutate(user.userId, user.tenantId, body);
  }

  @Post(ROUTES.TENANTS.ROLE_POLICY_RESET(":role"))
  @RequirePermission("tenant:ManagePermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  resetRolePolicy(
    @CurrentUser() user: RequestUser,
    @Param("role", new ZodValidationPipe(managedRoleSchema)) role: ManagedRole,
    @Body(new ZodValidationPipe(resetPolicySchema)) body: ResetPolicyDto
  ) {
    if (body.target.type !== "ROLE" || body.target.role !== role) {
      return this.permissionMatrix.rejectRouteTargetMismatch();
    }
    return this.permissionMatrix.reset(user.userId, user.tenantId, body);
  }

  @Post(ROUTES.TENANTS.PRINCIPAL_POLICY_RESET(":principalId"))
  @RequirePermission("tenant:ManagePermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  resetPrincipalPolicy(
    @CurrentUser() user: RequestUser,
    @Param("principalId") principalId: string,
    @Body(new ZodValidationPipe(resetPolicySchema)) body: ResetPolicyDto
  ) {
    if (body.target.type !== "PRINCIPAL" || body.target.principalId !== principalId) {
      return this.permissionMatrix.rejectRouteTargetMismatch();
    }
    return this.permissionMatrix.reset(user.userId, user.tenantId, body);
  }

  @Get(ROUTES.TENANTS.PERMISSION_MATRIX)
  @RequirePermission("tenant:ReadPermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getPermissionMatrix(@CurrentUser() user: RequestUser) {
    return this.permissionMatrix.getMatrix(user.tenantId);
  }

  @Patch(ROUTES.TENANTS.PERMISSION_MATRIX)
  @RequirePermission("tenant:ManagePermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  updatePermissionMatrixPolicy(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updatePermissionMatrixPolicySchema))
    body: UpdatePermissionMatrixPolicyDto
  ) {
    return this.permissionMatrix.updatePolicy(user.userId, user.tenantId, body);
  }

  @Get(ROUTES.TENANTS.MEMBER_PERMISSIONS(":memberId"))
  @RequirePermission("tenant:ReadPermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getMemberPermissions(@CurrentUser() user: RequestUser, @Param("memberId") memberId: string) {
    return this.permissionMatrix.getMemberPermissions(user.tenantId, memberId);
  }

  @Patch(ROUTES.TENANTS.MEMBER_PERMISSIONS(":memberId"))
  @RequirePermission("tenant:ManagePermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  updateMemberPermission(
    @CurrentUser() user: RequestUser,
    @Param("memberId") memberId: string,
    @Body(new ZodValidationPipe(updateMemberPermissionSchema))
    body: UpdateMemberPermissionDto
  ) {
    return this.permissionMatrix.updateMemberPermission(user.userId, user.tenantId, memberId, body);
  }

  @Post(ROUTES.TENANTS.MEMBER_RESTORE_ROLE_DEFAULTS(":memberId"))
  @RequirePermission("tenant:ManagePermissionPolicy", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  restoreMemberRoleDefaults(@CurrentUser() user: RequestUser, @Param("memberId") memberId: string) {
    return this.permissionMatrix.restoreRoleDefaults(user.userId, user.tenantId, memberId);
  }

  private requireExplicitPolicyTarget(query: PolicyDirectoryQueryDto) {
    return this.permissionMatrix.requireExplicitTarget(query);
  }
}
