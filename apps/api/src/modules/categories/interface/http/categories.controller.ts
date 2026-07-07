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
import { Roles } from "../../../../common/decorators/roles.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { CategoriesService } from "../../application/categories.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Get(ROUTES.CATEGORIES.LIST)
  list(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(listCategoriesQuerySchema)) query: ListCategoriesQuery
  ) {
    return this.categories.list(user.workspaceId, query);
  }

  @Roles("ADMIN")
  @Post(ROUTES.CATEGORIES.CREATE)
  create(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(createCategorySchema)) body: unknown
  ) {
    return this.categories.create(
      user.workspaceId,
      body as Parameters<CategoriesService["create"]>[1]
    );
  }

  @Roles("ADMIN")
  @Get(ROUTES.CATEGORIES.BULK_TEMPLATE)
  async getBulkCategoryTemplate(
    @WorkspaceUser() _user: WorkspaceRequestUser,
    @Res() res: Response
  ) {
    await this.categories.generateBulkCategoryTemplate(res);
  }

  @Roles("ADMIN")
  @Post(ROUTES.CATEGORIES.BULK_UPLOAD)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  async bulkCategoryUpload(
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @WorkspaceUser() user: WorkspaceRequestUser
  ) {
    if (!file) throw new Error("No file uploaded");

    const categories = await this.categories.parseBulkCategoryExcel(file.buffer);
    return this.categories.bulkImport(user.workspaceId, categories);
  }

  @Roles("ADMIN")
  @Post(ROUTES.CATEGORIES.BULK)
  bulkCategoryImport(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(bulkCategoryImportSchema))
    body: { categories: BulkCategoryImportItemDto[] }
  ) {
    return this.categories.bulkImport(user.workspaceId, body.categories);
  }

  @Roles("ADMIN")
  @Patch(ROUTES.CATEGORIES.BY_ID(":id"))
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

  @Roles("ADMIN")
  @Delete(ROUTES.CATEGORIES.BY_ID(":id"))
  remove(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    return this.categories.remove(user.workspaceId, id);
  }
}
