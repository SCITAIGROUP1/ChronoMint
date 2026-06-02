import { Body, Controller, Get, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import {
  exportBodySchema,
  exportQuerySchema,
  memberExportBodySchema,
  ROUTES
} from "@chronomint/contracts";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { Roles } from "../../../../common/decorators/roles.decorator";
import { CurrentUser, RequestUser } from "../../../../common/decorators/current-user.decorator";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { sendAttachment } from "../../../../common/http/attachment.util";
import { ProjectAccessService } from "../../../projects/application/project-access.service";
import { ExportService } from "../../application/export.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportController {
  constructor(
    private exportService: ExportService,
    private projectAccess: ProjectAccessService
  ) {}

  @Roles("ADMIN")
  @Post(ROUTES.EXPORT.GENERATE)
  async generatePost(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(exportBodySchema)) body: unknown,
    @Res() res: Response
  ) {
    const result = await this.exportService.generate(
      user.workspaceId,
      body as Parameters<ExportService["generate"]>[1]
    );
    sendAttachment(res, result);
  }

  @Roles("ADMIN", "MEMBER")
  @Post(ROUTES.EXPORT.ME)
  async generateMember(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(memberExportBodySchema)) body: unknown,
    @Res() res: Response
  ) {
    const dto = body as Parameters<ExportService["generateMember"]>[2];
    if (dto.projectId) {
      await this.projectAccess.assertCanAccessProject(
        user.workspaceId,
        user.userId,
        user.role,
        dto.projectId
      );
    }
    const result = await this.exportService.generateMember(user.workspaceId, user.userId, dto);
    sendAttachment(res, result);
  }

  @Roles("ADMIN")
  @Get(ROUTES.EXPORT.GENERATE)
  async generateGet(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(exportQuerySchema)) query: unknown,
    @Res() res: Response
  ) {
    const q = query as {
      from: string;
      to: string;
      projectId?: string;
      userId?: string;
      format: "csv" | "pdf" | "xlsx";
    };
    const result = await this.exportService.generateLegacy(user.workspaceId, q);
    sendAttachment(res, result);
  }
}
