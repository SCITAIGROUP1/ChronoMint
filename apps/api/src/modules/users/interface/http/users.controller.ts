import {
  changePasswordSchema,
  dashboardLayoutQuerySchema,
  ErrorCodes,
  ROUTES,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
  setUserProjectColorSchema,
  twoFactorDisableSchema,
  twoFactorVerifySchema,
  updateDashboardLayoutSchema,
  updateUserPreferencesSchema,
  updateUserProfileSchema,
  type DashboardLayoutQueryDto,
  type Permission
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { AuthorizationEnforcementService } from "../../../../common/access/authorization-enforcement.service";
import { refreshCookieName, getAuthScope } from "../../../../common/auth/auth-scope";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { TenantScoped } from "../../../../common/decorators/tenant-scoped.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { DomainException } from "../../../../common/errors/domain.exception";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { Users2faService } from "../../application/users-2fa.service";
import { UsersSessionsService } from "../../application/users-sessions.service";
import { UsersService } from "../../application/users.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private users: UsersService,
    private sessions: UsersSessionsService,
    private twoFa: Users2faService,
    private authorization: AuthorizationEnforcementService
  ) {}

  @Get(ROUTES.USERS.ME)
  @TenantScoped()
  async getMe(@CurrentUser() user: RequestUser) {
    await this.authorizeSelf(user, "personal:ManageProfile");
    if (user.workspaceId && user.role) {
      return this.users.getProfile(user.userId, user.workspaceId, user.role);
    }
    return this.users.getTenantOperatorProfile(user.userId, user.tenantId);
  }

  @Patch(ROUTES.USERS.ME)
  @TenantScoped()
  async updateMe(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateUserProfileSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ManageProfile");
    if (user.workspaceId && user.role) {
      return this.users.updateProfile(
        user.userId,
        user.workspaceId,
        body as Parameters<UsersService["updateProfile"]>[2],
        user.role
      );
    }
    return this.users.updateTenantOperatorProfile(
      user.userId,
      user.tenantId,
      body as Parameters<UsersService["updateTenantOperatorProfile"]>[2]
    );
  }

  @Get(ROUTES.USERS.DASHBOARD_LAYOUT)
  async getDashboardLayout(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(dashboardLayoutQuerySchema)) query: DashboardLayoutQueryDto
  ) {
    await this.authorizeSelf(user, "personal:ManageProfile");
    return this.users.getDashboardLayout(user.userId, user.workspaceId, query.app);
  }

  @Put(ROUTES.USERS.DASHBOARD_LAYOUT)
  async updateDashboardLayout(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(updateDashboardLayoutSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ManageProfile");
    return this.users.updateDashboardLayout(
      user.userId,
      user.workspaceId,
      body as Parameters<UsersService["updateDashboardLayout"]>[2]
    );
  }

  @Patch(ROUTES.USERS.PREFERENCES)
  @TenantScoped()
  async updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateUserPreferencesSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ManageProfile");
    if (user.workspaceId && user.role) {
      return this.users.updatePreferences(
        user.userId,
        user.workspaceId,
        body as Parameters<UsersService["updatePreferences"]>[2],
        user.role
      );
    }
    return this.users.updateTenantOperatorPreferences(
      user.userId,
      user.tenantId,
      body as Parameters<UsersService["updateTenantOperatorPreferences"]>[2]
    );
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.USERS.PASSWORD)
  @TenantScoped()
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ManageAccountSecurity");
    return this.users.changePassword(
      user.userId,
      body as Parameters<UsersService["changePassword"]>[1]
    );
  }

  @Get(ROUTES.USERS.SESSIONS)
  @TenantScoped()
  async listSessions(@CurrentUser() user: RequestUser, @Req() req: Request) {
    await this.authorizeSelf(user, "personal:ManageAccountSecurity");
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)];
    return this.sessions.listSessions(user.userId, refresh);
  }

  @Delete(ROUTES.USERS.SESSION(":id"))
  @TenantScoped()
  async revokeSession(@CurrentUser() user: RequestUser, @Param("id") sessionId: string) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ManageAccountSecurity");
    return this.sessions.revokeSession(user.userId, sessionId);
  }

  @Post(ROUTES.USERS.REVOKE_OTHER_SESSIONS)
  @TenantScoped()
  async revokeOtherSessions(@CurrentUser() user: RequestUser, @Req() req: Request) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ManageAccountSecurity");
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)];
    return this.sessions.revokeOtherSessions(user.userId, refresh);
  }

  @Post(ROUTES.USERS.TWO_FA_ENABLE)
  @TenantScoped()
  async enable2fa(@CurrentUser() user: RequestUser) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ManageAccountSecurity");
    const profilePromise =
      user.workspaceId && user.role
        ? this.users.getProfile(user.userId, user.workspaceId, user.role)
        : this.users.getTenantOperatorProfile(user.userId, user.tenantId);
    return profilePromise.then((profile) => this.twoFa.enable(user.userId, profile.email));
  }

  @Post(ROUTES.USERS.TWO_FA_VERIFY)
  @TenantScoped()
  async verify2fa(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(twoFactorVerifySchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ManageAccountSecurity");
    return this.twoFa.verify(user.userId, body as Parameters<Users2faService["verify"]>[1]);
  }

  @Put(ROUTES.USERS.PROJECT_COLOR(":projectId"))
  async setProjectColor(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(setUserProjectColorSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ListProjects");
    return this.users.setProjectColor(
      user.userId,
      user.workspaceId,
      projectId,
      body as Parameters<UsersService["setProjectColor"]>[3]
    );
  }

  @Delete(ROUTES.USERS.PROJECT_COLOR(":projectId"))
  async clearProjectColor(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("projectId") projectId: string
  ) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ListProjects");
    return this.users.clearProjectColor(user.userId, user.workspaceId, projectId);
  }

  @Post(ROUTES.USERS.TWO_FA_DISABLE)
  @TenantScoped()
  async disable2fa(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(twoFactorDisableSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ManageAccountSecurity");
    return this.twoFa.disable(user.userId, body as Parameters<Users2faService["disable"]>[1]);
  }

  @Post(ROUTES.USERS.PHONE_SEND_OTP)
  async sendPhoneOtp(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(sendPhoneOtpSchema)) body: any
  ) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ManageAccountSecurity");
    return this.users.sendPhoneOtp(user.userId, user.workspaceId, body.phone, user.role);
  }

  @Post(ROUTES.USERS.PHONE_VERIFY_OTP)
  async verifyPhoneOtp(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(verifyPhoneOtpSchema)) body: any
  ) {
    this.assertNotImpersonating(user);
    await this.authorizeSelf(user, "personal:ManageAccountSecurity");
    return this.users.verifyPhoneOtp(user.userId, user.workspaceId, body.code, user.role);
  }

  private assertNotImpersonating(user: RequestUser) {
    if (user.impersonatorId) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Cannot modify account while impersonating",
        HttpStatus.FORBIDDEN
      );
    }
  }

  private authorizeSelf(user: RequestUser, permission: Permission) {
    return this.authorization.assertAllowed({
      principalId: user.userId,
      permission,
      resource: {
        scope: "self",
        ...(user.workspaceId ? { workspaceId: user.workspaceId } : { tenantId: user.tenantId })
      }
    });
  }
}
