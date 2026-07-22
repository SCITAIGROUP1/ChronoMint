import { ROUTES } from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards
} from "@nestjs/common";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { PlatformJwtAuthGuard } from "../../../../common/guards/platform-jwt-auth.guard";
import { PlatformOperationsControlsService } from "../../application/platform-operations-controls.service";

@Controller()
@UseGuards(PlatformJwtAuthGuard, PermissionGuard)
export class PlatformOperationsControlsController {
  constructor(private service: PlatformOperationsControlsService) {}

  @Get(ROUTES.PLATFORM.QUEUE_FAILED_JOBS(":name"))
  @RequirePermission("platform:ReadQueues", { scope: "platform" })
  async getFailedJobs(@Param("name") name: string) {
    return this.service.getFailedJobs(name);
  }

  @Post(ROUTES.PLATFORM.QUEUE_RETRY_JOB(":name", ":jobId"))
  @RequirePermission("platform:ManageQueues", { scope: "platform" })
  async retryJob(
    @Param("name") name: string,
    @Param("jobId") jobId: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.retryJob(name, jobId, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.QUEUE_PAUSE(":name"))
  @RequirePermission("platform:ManageQueues", { scope: "platform" })
  async pauseQueue(@Param("name") name: string, @CurrentPlatformUser() actor: PlatformRequestUser) {
    return this.service.pauseQueue(name, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.QUEUE_RESUME(":name"))
  @RequirePermission("platform:ManageQueues", { scope: "platform" })
  async resumeQueue(
    @Param("name") name: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.resumeQueue(name, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.QUEUE_RETRY_FAILED(":name"))
  @RequirePermission("platform:ManageQueues", { scope: "platform" })
  async retryFailedJobs(
    @Param("name") name: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.retryFailedJobs(name, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.TENANT_LIMITS_OVERRIDE(":id"))
  @RequirePermission("platform:ManageTenantLimits", { scope: "platform" })
  async overrideLimits(
    @Param("id") tenantId: string,
    @Body() limits: Record<string, any>,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.overrideLimits(tenantId, limits, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.TENANT_GRACE_PERIOD(":id"))
  @RequirePermission("platform:ManageTenantLimits", { scope: "platform" })
  async updateGracePeriod(
    @Param("id") tenantId: string,
    @Body("graceDays", ParseIntPipe) graceDays: number,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.updateGracePeriod(tenantId, graceDays, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.TENANT_REVOKE_SESSIONS(":id"))
  @RequirePermission("platform:ManageTenantSecurity", { scope: "platform" })
  async revokeSessions(
    @Param("id") tenantId: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.revokeTenantSessions(tenantId, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.TENANT_RESET_MFA(":id"))
  @RequirePermission("platform:ManageTenantSecurity", { scope: "platform" })
  async resetMfa(@Param("id") tenantId: string, @CurrentPlatformUser() actor: PlatformRequestUser) {
    return this.service.resetTenantMfa(tenantId, actor.platformUserId);
  }

  @Post(ROUTES.PLATFORM.TENANT_GDPR_EXPORT(":id"))
  @RequirePermission("platform:ExportTenantData", { scope: "platform" })
  async gdprExportTenant(
    @Param("id") tenantId: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.gdprExportTenant(tenantId, actor.platformUserId);
  }

  @Delete(ROUTES.PLATFORM.TENANT_GDPR_DELETE(":id"))
  @RequirePermission("platform:DeleteTenantData", { scope: "platform" })
  async gdprDelete(
    @Param("id") tenantId: string,
    @CurrentPlatformUser() actor: PlatformRequestUser
  ) {
    return this.service.gdprDeleteTenant(tenantId, actor.platformUserId);
  }
}
