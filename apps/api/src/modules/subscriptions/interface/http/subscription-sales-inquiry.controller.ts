import { createSalesInquirySchema, ROUTES, type CreateSalesInquiryDto } from "@kloqra/contracts";
import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../../../common/decorators/require-permission.decorator";
import { TenantScoped } from "../../../../common/decorators/tenant-scoped.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../../../common/guards/permission.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { BILLING_RECEIPT_MAX_BYTES } from "../../application/billing-receipt-storage.util";
import { SubscriptionSalesInquiryService } from "../../application/subscription-sales-inquiry.service";

@Controller()
@TenantScoped()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SubscriptionSalesInquiryController {
  constructor(private salesInquiries: SubscriptionSalesInquiryService) {}

  @Get(ROUTES.TENANTS.SALES_INQUIRY)
  @RequirePermission("tenant:ManageSalesInquiry", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  getCurrent(@CurrentUser() user: RequestUser) {
    return this.salesInquiries.getCurrentInquiry(user.tenantId);
  }

  @Post(ROUTES.TENANTS.SALES_INQUIRY)
  @RequirePermission("tenant:ManageSalesInquiry", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createSalesInquirySchema)) body: CreateSalesInquiryDto
  ) {
    return this.salesInquiries.createInquiry(user.tenantId, user.userId, body);
  }

  @Post(ROUTES.TENANTS.SALES_INQUIRY_RECEIPTS)
  @RequirePermission("tenant:ManageSalesInquiry", {
    scope: "tenant",
    tenantId: { source: "session", field: "tenantId" }
  })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: BILLING_RECEIPT_MAX_BYTES } }))
  uploadReceipt(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number }
  ) {
    return this.salesInquiries.uploadReceipt(user.tenantId, user.userId, file);
  }
}
