import { BullModule } from "@nestjs/bullmq";
import { Module, forwardRef } from "@nestjs/common";
import { PlatformJwtAuthGuard } from "../../common/guards/platform-jwt-auth.guard";
import { PlatformGuard } from "../../common/guards/platform.guard";
import { TenantOwnerProvisioningMailer } from "../../common/mailer/tenant-owner-provisioning.mailer";
import { QUEUES } from "../../common/queues";
import { TenantProvisioningModule } from "../../common/tenant/tenant-provisioning.module";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { PlatformOpsService } from "./application/platform-ops.service";
import { PlatformTenantsService } from "./application/platform-tenants.service";
import { PlatformAuditController } from "./interface/http/platform-audit.controller";
import { PlatformOpsController } from "./interface/http/platform-ops.controller";
import {
  PlatformPlansController,
  PlatformTenantsController
} from "./interface/http/platform-tenants.controller";
import { PlatformAuditModule } from "./platform-audit.module";

@Module({
  imports: [
    forwardRef(() => AuthModule),
    SubscriptionsModule,
    PlatformAuditModule,
    TenantProvisioningModule,
    BullModule.registerQueue(
      { name: QUEUES.MAIL },
      { name: QUEUES.BULK_INVITE },
      { name: QUEUES.BULK_CATEGORY },
      { name: QUEUES.EXPORT }
    )
  ],
  controllers: [
    PlatformTenantsController,
    PlatformPlansController,
    PlatformAuditController,
    PlatformOpsController
  ],
  providers: [
    PlatformTenantsService,
    PlatformOpsService,
    PlatformGuard,
    PlatformJwtAuthGuard,
    TenantOwnerProvisioningMailer
  ],
  exports: [PlatformTenantsService, PlatformOpsService]
})
export class PlatformModule {}
