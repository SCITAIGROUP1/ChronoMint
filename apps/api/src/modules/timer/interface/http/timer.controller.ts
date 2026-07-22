import { startTimerSchema, stopTimerSchema, ROUTES } from "@kloqra/contracts";
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TimerService } from "../../application/timer.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TimerController {
  constructor(private timer: TimerService) {}

  @RequirePermission("personal:ManageTimer", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  @Post(ROUTES.TIMER.START)
  start(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(startTimerSchema)) body: unknown
  ) {
    return this.timer.start(
      user.workspaceId,
      user.userId,
      user.role,
      body as Parameters<TimerService["start"]>[3]
    );
  }

  @RequirePermission("personal:ManageTimer", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  @Post(ROUTES.TIMER.STOP)
  stop(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(stopTimerSchema)) body: unknown
  ) {
    return this.timer.stop(
      user.workspaceId,
      user.userId,
      user.role,
      body as Parameters<TimerService["stop"]>[3]
    );
  }

  @RequirePermission("personal:ManageTimer", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  @Get(ROUTES.TIMER.ACTIVE)
  active(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.timer.active(user.workspaceId, user.userId);
  }

  @RequirePermission("personal:ManageTimer", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  @Post(ROUTES.TIMER.PAUSE)
  pause(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.timer.pause(user.workspaceId, user.userId);
  }

  @RequirePermission("personal:ManageTimer", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  @Post(ROUTES.TIMER.RESUME)
  resume(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.timer.resume(user.workspaceId, user.userId);
  }

  @RequirePermission("personal:ManageTimer", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  @Post(ROUTES.TIMER.DISCARD)
  discard(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.timer.discard(user.workspaceId, user.userId);
  }

  @RequirePermission("workspace:ReadPresence", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  @Get(ROUTES.TIMER.ACTIVE_COUNT)
  activeCount(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.timer.activeCount(user.workspaceId);
  }
}
