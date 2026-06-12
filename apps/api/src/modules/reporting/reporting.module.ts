import { Module } from "@nestjs/common";
import { AccessModule } from "../../common/access/access.module";
import { TimeModule } from "../../common/time/time.module";
import { AuthModule } from "../auth/auth.module";
import { ReportingService } from "./application/reporting.service";
import { ReportingController } from "./interface/http/reporting.controller";

@Module({
  imports: [AuthModule, TimeModule, AccessModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService]
})
export class ReportingModule {}
