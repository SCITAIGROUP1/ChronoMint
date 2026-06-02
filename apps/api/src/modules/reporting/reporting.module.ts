import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ReportingController } from "./interface/http/reporting.controller";
import { ReportingService } from "./application/reporting.service";
import { TimeAggregationService } from "./application/time-aggregation.service";

@Module({
  imports: [AuthModule],
  controllers: [ReportingController],
  providers: [ReportingService, TimeAggregationService],
  exports: [TimeAggregationService]
})
export class ReportingModule {}
