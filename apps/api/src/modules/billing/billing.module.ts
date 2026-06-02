import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BillingController } from "./interface/http/billing.controller";
import { BillingService } from "./application/billing.service";

@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService]
})
export class BillingModule {}
