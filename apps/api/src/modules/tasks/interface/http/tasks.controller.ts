import {
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
  type ListTasksQuery,
  ROUTES
} from "@kloqra/contracts";
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
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TasksService } from "../../application/tasks.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Get(ROUTES.TASKS.LIST)
  @RequirePermission("workspace:Access", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  list(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(listTasksQuerySchema)) query: ListTasksQuery
  ) {
    return this.tasks.list(user.workspaceId, user.userId, user.role, query, user.managedProjectIds);
  }

  @Post(ROUTES.TASKS.CREATE)
  create(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createTaskSchema)) body: unknown
  ) {
    return this.tasks.create(
      user.workspaceId,
      user.userId,
      user.role,
      body as Parameters<TasksService["create"]>[3]
    );
  }

  @Patch(ROUTES.TASKS.BY_ID(":id"))
  update(
    @WorkspaceUser() user: WorkspaceRequestUser,
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

  @Delete(ROUTES.TASKS.BY_ID(":id"))
  remove(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    return this.tasks.remove(user.workspaceId, user.userId, user.role, id);
  }
}
