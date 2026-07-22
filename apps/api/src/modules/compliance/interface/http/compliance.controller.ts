import { ROUTES } from "@kloqra/contracts";
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { type Response } from "express";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { TenantScoped } from "../../../../common/decorators/tenant-scoped.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { RedisService } from "../../../../common/redis/redis.service";
import { TenantDataExportService } from "../../application/tenant-data-export.service";
import { TenantDataImportService } from "../../application/tenant-data-import.service";

@Controller()
@TenantScoped()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ComplianceController {
  constructor(
    private tenantDataExport: TenantDataExportService,
    private tenantDataImport: TenantDataImportService,
    private redisService: RedisService
  ) {}

  @Post(ROUTES.TENANTS.DATA_EXPORT)
  @RequirePermission("tenant:ExportData", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  createExport(@CurrentUser() user: RequestUser) {
    return this.tenantDataExport.create(user.tenantId, user.userId);
  }

  @Get(ROUTES.TENANTS.DATA_EXPORT)
  @RequirePermission("tenant:ExportData", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getLatestExport(@CurrentUser() user: RequestUser) {
    return this.tenantDataExport.getLatest(user.tenantId);
  }

  @Get(ROUTES.TENANTS.DATA_EXPORT_JOB(":jobId"))
  @RequirePermission("tenant:ExportData", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getExport(@CurrentUser() user: RequestUser, @Param("jobId") jobId: string) {
    return this.tenantDataExport.get(user.tenantId, jobId);
  }

  @Delete(ROUTES.TENANTS.DATA_EXPORT_JOB(":jobId"))
  @RequirePermission("tenant:ExportData", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  cancelExport(@CurrentUser() user: RequestUser, @Param("jobId") jobId: string) {
    return this.tenantDataExport.cancel(user.tenantId, jobId);
  }

  @Get(ROUTES.TENANTS.DATA_EXPORT_JOB_DOWNLOAD(":jobId"))
  @RequirePermission("tenant:ExportData", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  @Header("Cache-Control", "private, no-store")
  async downloadExport(
    @CurrentUser() user: RequestUser,
    @Param("jobId") jobId: string,
    @Res() res: Response
  ) {
    const { buffer, contentType, filename } = await this.tenantDataExport.download(
      user.tenantId,
      jobId
    );
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post(ROUTES.TENANTS.DATA_IMPORT)
  @RequirePermission("tenant:ImportData", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  @UseInterceptors(FileInterceptor("file"))
  async importData(
    @UploadedFile() file: { originalname: string; buffer: Buffer } | undefined,
    @CurrentUser() user: RequestUser
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }
    return this.tenantDataImport.create(user.tenantId, user.userId, file.originalname, file.buffer);
  }

  @Get(ROUTES.TENANTS.DATA_IMPORT)
  @RequirePermission("tenant:ImportData", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  async getLatestImport(@CurrentUser() user: RequestUser) {
    const redis = this.redisService.getClient();
    const latestJobId = await redis.get(`tenant:${user.tenantId}:latest-import`);
    if (!latestJobId) return null;
    try {
      return await this.tenantDataImport.get(user.tenantId, latestJobId);
    } catch {
      return null;
    }
  }
}
