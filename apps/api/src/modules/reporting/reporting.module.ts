import { Module } from "@nestjs/common";
import { TimeModule } from "../../common/time/time.module";
import { AuthModule } from "../auth/auth.module";
import { ReportingService } from "./application/reporting.service";
import { ReportingController } from "./interface/http/reporting.controller";

@Module({
  imports: [AuthModule, TimeModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService]
})
export class ReportingModule {}
