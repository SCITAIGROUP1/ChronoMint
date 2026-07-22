import {
  bulkCategoryImportSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
  type BulkCategoryImportItemDto,
  type ListCategoriesQuery,
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
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { CategoriesService } from "../../application/categories.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Get(ROUTES.CATEGORIES.LIST)
  @RequirePermission("workspace:ListCategories", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  list(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(listCategoriesQuerySchema)) query: ListCategoriesQuery
  ) {
    return this.categories.list(user.workspaceId, query);
  }

  @Post(ROUTES.CATEGORIES.CREATE)
  @RequirePermission("workspace:ManageCategories", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" },
    expectedTenantId: { source: "session", field: "tenantId" }
  })
  create(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createCategorySchema)) body: unknown
  ) {
    return this.categories.create(
      user.workspaceId,
      body as Parameters<CategoriesService["create"]>[1]
    );
  }

  @Get(ROUTES.CATEGORIES.BULK_TEMPLATE)
  @RequirePermission("workspace:ManageCategories", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  async getBulkCategoryTemplate(
    @WorkspaceUser() _user: WorkspaceRequestUser,
    @Res() res: Response
  ) {
    await this.categories.generateBulkCategoryTemplate(res);
  }

  @Post(ROUTES.CATEGORIES.BULK_UPLOAD)
  @RequirePermission("workspace:ManageCategories", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  async bulkCategoryUpload(
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @WorkspaceUser() user: WorkspaceRequestUser
  ) {
    if (!file) throw new Error("No file uploaded");

    const categories = await this.categories.parseBulkCategoryExcel(file.buffer);
    return this.categories.bulkImport(user.workspaceId, categories);
  }

  @Post(ROUTES.CATEGORIES.BULK)
  @RequirePermission("workspace:ManageCategories", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  bulkCategoryImport(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(bulkCategoryImportSchema))
    body: { categories: BulkCategoryImportItemDto[] }
  ) {
    return this.categories.bulkImport(user.workspaceId, body.categories);
  }

  @Patch(ROUTES.CATEGORIES.BY_ID(":id"))
  @RequirePermission("workspace:ManageCategories", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  update(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: unknown
  ) {
    return this.categories.update(
      user.workspaceId,
      id,
      body as Parameters<CategoriesService["update"]>[2]
    );
  }

  @Delete(ROUTES.CATEGORIES.BY_ID(":id"))
  @RequirePermission("workspace:ManageCategories", {
    scope: "workspace",
    workspaceId: { source: "session", field: "workspaceId" }
  })
  remove(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    return this.categories.remove(user.workspaceId, id);
  }
}
