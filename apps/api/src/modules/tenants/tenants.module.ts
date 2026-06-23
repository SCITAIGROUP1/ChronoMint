import { Module } from "@nestjs/common";
import { TimeModule } from "../../common/time/time.module";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { WorkspaceModule } from "../workspace/workspace.module";
import { TenantAnalyticsService } from "./application/tenant-analytics.service";
import { TenantsService } from "./application/tenants.service";
import { TenantsController } from "./interface/http/tenants.controller";

@Module({
  imports: [AuthModule, WorkspaceModule, SubscriptionsModule, TimeModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantAnalyticsService]
})
export class TenantsModule {}
