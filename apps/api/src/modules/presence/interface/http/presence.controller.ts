import { ROUTES } from "@kloqra/contracts";
import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { type Response, type Request } from "express";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { AdminOrProjectLeadGuard } from "../../../../common/guards/admin-or-project-lead.guard";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { PresenceService } from "../../application/presence.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PresenceController {
  constructor(private presence: PresenceService) {}

  @UseGuards(AdminOrProjectLeadGuard)
  @Roles("ADMIN", "MEMBER")
  @Get(ROUTES.PRESENCE.SNAPSHOT)
  snapshot(@CurrentUser() user: RequestUser) {
    return this.presence.snapshot(user.workspaceId, user.userId, user.role, user.ledProjectIds);
  }

  @UseGuards(AdminOrProjectLeadGuard)
  @Roles("ADMIN", "MEMBER")
  @Get(ROUTES.PRESENCE.STREAM)
  stream(@CurrentUser() user: RequestUser, @Req() req: Request, @Res() res: Response) {
    return this.presence.streamSse(
      user.workspaceId,
      req,
      res,
      user.userId,
      user.role,
      user.ledProjectIds
    );
  }
}
