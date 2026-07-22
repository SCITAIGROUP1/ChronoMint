import {
  listNotificationsQuerySchema,
  markAllNotificationsReadSchema,
  ROUTES,
  updateNotificationReadSchema,
  type ListNotificationsQuery,
  type MarkAllNotificationsReadDto,
  type UpdateNotificationReadDto
} from "@kloqra/contracts";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { NotificationsService } from "../../application/notifications.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @RequirePermission("personal:ReadNotifications", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" },
    tenantId: { source: "session", field: "tenantId" }
  })
  @Get(ROUTES.NOTIFICATIONS.LIST)
  list(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema)) query: ListNotificationsQuery
  ) {
    return this.notifications.list(user.userId, user.workspaceId, query);
  }

  @RequirePermission("personal:ReadNotifications", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" },
    tenantId: { source: "session", field: "tenantId" }
  })
  @Get(ROUTES.NOTIFICATIONS.UNREAD_COUNT)
  unreadCount(@WorkspaceUser() user: WorkspaceRequestUser) {
    return this.notifications.unreadCount(user.userId, user.workspaceId);
  }

  @RequirePermission("personal:ManageNotifications", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" },
    tenantId: { source: "session", field: "tenantId" }
  })
  @Patch(ROUTES.NOTIFICATIONS.BY_ID(":id"))
  updateRead(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateNotificationReadSchema)) body: UpdateNotificationReadDto
  ) {
    return this.notifications.updateRead(user.userId, user.workspaceId, id, body);
  }

  @RequirePermission("personal:ManageNotifications", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" },
    tenantId: { source: "session", field: "tenantId" }
  })
  @Post(ROUTES.NOTIFICATIONS.MARK_ALL_READ)
  markAllRead(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(markAllNotificationsReadSchema)) body: MarkAllNotificationsReadDto
  ) {
    return this.notifications.markAllRead(user.userId, user.workspaceId, body);
  }
}
