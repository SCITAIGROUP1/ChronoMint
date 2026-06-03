import {
  createTimeLogSchema,
  listTimeLogsQuerySchema,
  updateTimeLogSchema,
  ROUTES
} from "@chronomint/contracts";
import type { ListTimeLogsQueryDto } from "@chronomint/contracts";
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
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TimelogsService } from "../../application/timelogs.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class TimelogsController {
  constructor(private timelogs: TimelogsService) {}

  @Get(ROUTES.TIMELOGS.LIST)
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listTimeLogsQuerySchema)) query: unknown
  ) {
    return this.timelogs.list(
      user.workspaceId,
      user.userId,
      user.role,
      query as ListTimeLogsQueryDto
    );
  }

  @Post(ROUTES.TIMELOGS.CREATE)
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createTimeLogSchema)) body: unknown
  ) {
    return this.timelogs.create(
      user.workspaceId,
      user.userId,
      body as Parameters<TimelogsService["create"]>[2]
    );
  }

  @Patch("/timelogs/:id")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTimeLogSchema)) body: unknown
  ) {
    return this.timelogs.update(
      user.workspaceId,
      user.userId,
      user.role,
      id,
      body as Parameters<TimelogsService["update"]>[4]
    );
  }

  @Delete("/timelogs/:id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.timelogs.remove(user.workspaceId, user.userId, user.role, id);
  }
}
