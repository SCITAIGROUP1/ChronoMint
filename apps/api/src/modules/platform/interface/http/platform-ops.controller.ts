import { ROUTES } from "@kloqra/contracts";
import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  CurrentPlatformUser,
  type PlatformRequestUser
} from "../../../../common/decorators/current-platform-user.decorator";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { PlatformJwtAuthGuard } from "../../../../common/guards/platform-jwt-auth.guard";
import { PlatformOpsService } from "../../application/platform-ops.service";

@Controller()
@UseGuards(PlatformJwtAuthGuard, PermissionGuard)
export class PlatformOpsController {
  constructor(private ops: PlatformOpsService) {}

  @Get(ROUTES.PLATFORM.OPS_SUMMARY)
  @RequirePermission("platform:ReadOperations", { scope: "platform" })
  summary(@CurrentPlatformUser() _user: PlatformRequestUser) {
    return this.ops.getOpsSummary();
  }
}
