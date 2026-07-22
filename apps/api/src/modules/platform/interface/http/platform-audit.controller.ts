import { listPlatformAuditEventsQuerySchema, ROUTES } from "@kloqra/contracts";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { PlatformJwtAuthGuard } from "../../../../common/guards/platform-jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { PlatformAuditService } from "../../application/platform-audit.service";

@Controller()
@UseGuards(PlatformJwtAuthGuard, PermissionGuard)
export class PlatformAuditController {
  constructor(private audit: PlatformAuditService) {}

  @Get(ROUTES.PLATFORM.AUDIT_EVENTS)
  @RequirePermission("platform:ReadAuditLog", { scope: "platform" })
  list(@Query(new ZodValidationPipe(listPlatformAuditEventsQuerySchema)) query: unknown) {
    return this.audit.list(query as Parameters<PlatformAuditService["list"]>[0]);
  }
}
