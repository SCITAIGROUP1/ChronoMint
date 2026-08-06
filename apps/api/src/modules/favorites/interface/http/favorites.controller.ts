import {
  importEntryFavoritesSchema,
  ROUTES,
  type ImportEntryFavoritesDto
} from "@kloqra/contracts";
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { FavoritesService } from "../../application/favorites.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FavoritesController {
  constructor(private favorites: FavoritesService) {}

  @Get(ROUTES.FAVORITES.LIST)
  @RequirePermission("workspace:Access", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  list(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.favorites.list(user.userId, user.workspaceId);
  }

  @Put(ROUTES.FAVORITES.PROJECT(":projectId"))
  @RequirePermission("workspace:Access", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  addProject(@WorkspaceUser() user: WorkspaceRequestUser, @Param("projectId") projectId: string) {
    this.favorites.assertUuid(projectId, "project id");
    return this.favorites.addProject(user.userId, user.workspaceId, user.role, projectId);
  }

  @Delete(ROUTES.FAVORITES.PROJECT(":projectId"))
  @RequirePermission("workspace:Access", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  removeProject(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("projectId") projectId: string
  ) {
    this.favorites.assertUuid(projectId, "project id");
    return this.favorites.removeProject(user.userId, user.workspaceId, projectId);
  }

  @Put(ROUTES.FAVORITES.TASK(":taskId"))
  @RequirePermission("workspace:Access", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  addTask(@WorkspaceUser() user: WorkspaceRequestUser, @Param("taskId") taskId: string) {
    this.favorites.assertUuid(taskId, "task id");
    return this.favorites.addTask(user.userId, user.workspaceId, user.role, taskId);
  }

  @Delete(ROUTES.FAVORITES.TASK(":taskId"))
  @RequirePermission("workspace:Access", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  removeTask(@WorkspaceUser() user: WorkspaceRequestUser, @Param("taskId") taskId: string) {
    this.favorites.assertUuid(taskId, "task id");
    return this.favorites.removeTask(user.userId, user.workspaceId, taskId);
  }

  @Post(ROUTES.FAVORITES.IMPORT)
  @RequirePermission("workspace:Access", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  importLocal(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(importEntryFavoritesSchema)) body: ImportEntryFavoritesDto
  ) {
    return this.favorites.importLocal(user.userId, user.workspaceId, user.role, body);
  }
}
