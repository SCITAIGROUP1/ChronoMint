import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { Response, Request } from "express";
import { ROUTES } from "@chronomint/contracts";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { CurrentUser, RequestUser } from "../../../../common/decorators/current-user.decorator";
import { PresenceService } from "../../application/presence.service";
import { RedisService } from "../../../../common/redis/redis.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PresenceController {
  constructor(
    private presence: PresenceService,
    private redis: RedisService
  ) {}

  @Roles("ADMIN")
  @Get(ROUTES.PRESENCE.SNAPSHOT)
  snapshot(@CurrentUser() user: RequestUser) {
    return this.presence.snapshot(user.workspaceId);
  }

  @Roles("ADMIN")
  @Get(ROUTES.PRESENCE.STREAM)
  async stream(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res() res: Response
  ) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = async () => {
      const snapshot = await this.presence.snapshot(user.workspaceId);
      res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    };

    await send();
    const sub = this.redis.getClient().duplicate();
    await sub.subscribe(`presence:${user.workspaceId}`);
    sub.on("message", () => void send());

    req.on("close", () => {
      void sub.unsubscribe();
      void sub.quit();
      res.end();
    });
  }
}
