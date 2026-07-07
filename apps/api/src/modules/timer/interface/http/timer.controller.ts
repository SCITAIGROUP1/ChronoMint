import { startTimerSchema, stopTimerSchema, ROUTES } from "@kloqra/contracts";
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TimerService } from "../../application/timer.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class TimerController {
  constructor(private timer: TimerService) {}

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

  @Get(ROUTES.TIMER.ACTIVE)
  active(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.timer.active(user.workspaceId, user.userId);
  }

  @Post(ROUTES.TIMER.PAUSE)
  pause(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.timer.pause(user.workspaceId, user.userId);
  }

  @Post(ROUTES.TIMER.RESUME)
  resume(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.timer.resume(user.workspaceId, user.userId);
  }

  @Post(ROUTES.TIMER.DISCARD)
  discard(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.timer.discard(user.workspaceId, user.userId);
  }

  @Get(ROUTES.TIMER.ACTIVE_COUNT)
  activeCount(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.timer.activeCount(user.workspaceId);
  }
}
