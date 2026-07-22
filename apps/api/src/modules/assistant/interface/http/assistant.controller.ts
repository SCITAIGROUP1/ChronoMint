import { assistantChatRequestSchema, ROUTES } from "@kloqra/contracts";
import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { AssistantProxyService } from "../../application/assistant-proxy.service";
import { AssistantRateLimitService } from "../../application/assistant-rate-limit.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AssistantController {
  constructor(
    private proxy: AssistantProxyService,
    private rateLimit: AssistantRateLimitService
  ) {}

  @RequirePermission("personal:UseAssistant", {
    scope: "self",
    workspaceId: { source: "session", field: "workspaceId" },
    tenantId: { source: "session", field: "tenantId" }
  })
  @Post(ROUTES.ASSISTANT.CHAT)
  async chat(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(assistantChatRequestSchema)) body: unknown,
    @Req() req: Request
  ) {
    await this.rateLimit.assertWithinLimit(user.userId);
    const requestId =
      typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
    return this.proxy.chat(body as Parameters<AssistantProxyService["chat"]>[0], {
      requestId
    });
  }
}
