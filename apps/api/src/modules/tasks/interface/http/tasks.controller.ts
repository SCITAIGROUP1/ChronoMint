import {
  createTaskSchema,
  exportTasksQuerySchema,
  listTasksQuerySchema,
  updateTaskSchema,
  type ExportTasksQuery,
  type ListTasksQuery,
  ErrorCodes,
  ROUTES
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { DomainException } from "../../../../common/errors/domain.exception";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TaskImportService } from "../../application/task-import.service";
import { TasksService } from "../../application/tasks.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TasksController {
  constructor(
    private tasks: TasksService,
    private taskImport: TaskImportService
  ) {}

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

  @Get(ROUTES.TASKS.BULK_TEMPLATE)
  @RequirePermission("workspace:Access", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  async bulkTemplate(@WorkspaceUser() user: WorkspaceRequestUser, @Res() res: Response) {
    await this.taskImport.generateTemplate({
      workspaceId: user.workspaceId,
      userId: user.userId,
      role: user.role,
      managedProjectIds: user.managedProjectIds ?? [],
      res
    });
  }

  @Post(ROUTES.TASKS.BULK_UPLOAD)
  @RequirePermission("workspace:Access", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  async bulkUpload(
    @UploadedFile() file: { buffer: Buffer; originalname?: string } | undefined,
    @WorkspaceUser() user: WorkspaceRequestUser
  ) {
    if (!file?.buffer?.length) {
      throw new DomainException(
        ErrorCodes.VALIDATION_ERROR,
        "No file uploaded",
        HttpStatus.BAD_REQUEST
      );
    }
    return this.taskImport.importFile({
      workspaceId: user.workspaceId,
      userId: user.userId,
      role: user.role,
      managedProjectIds: user.managedProjectIds ?? [],
      buffer: file.buffer,
      filename: file.originalname
    });
  }

  @Get(ROUTES.TASKS.EXPORT)
  @RequirePermission("workspace:Access", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  async exportTasks(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(exportTasksQuerySchema)) query: ExportTasksQuery,
    @Res() res: Response
  ) {
    await this.taskImport.exportCatalog({
      workspaceId: user.workspaceId,
      userId: user.userId,
      role: user.role,
      managedProjectIds: user.managedProjectIds ?? [],
      query,
      res
    });
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
