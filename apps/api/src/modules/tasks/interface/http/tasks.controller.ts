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
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
  ROUTES
} from "@chronomint/contracts";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { CurrentUser, RequestUser } from "../../../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TasksService } from "../../application/tasks.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get(ROUTES.TASKS.LIST)
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(listTasksQuerySchema)) query: { projectId?: string }
  ) {
    return this.tasks.list(user.workspaceId, user.userId, user.role, query.projectId);
  }

  @Post(ROUTES.TASKS.CREATE)
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createTaskSchema)) body: unknown
  ) {
    return this.tasks.create(
      user.workspaceId,
      user.userId,
      user.role,
      body as Parameters<TasksService["create"]>[3]
    );
  }

  @Patch("/tasks/:id")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: unknown
  ) {
    return this.tasks.update(
      user.workspaceId,
      user.userId,
      user.role,
      id,
      body as Parameters<TasksService["update"]>[4]
    );
  }

  @Delete("/tasks/:id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.tasks.remove(user.workspaceId, user.userId, user.role, id);
  }
}
