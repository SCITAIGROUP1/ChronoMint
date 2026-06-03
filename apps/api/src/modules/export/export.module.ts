import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { ReportingModule } from "../reporting/reporting.module";
import { ExportController } from "./interface/http/export.controller";
import { ExportShareController } from "./interface/http/export-share.controller";
import { ExportService } from "./application/export.service";
import { ExportRowsBuilder } from "./application/export-rows.builder";
import { ExportPresetService } from "./application/export-preset.service";
import { ExportScheduleService } from "./application/export-schedule.service";
import { ReportShareService } from "./application/report-share.service";

@Module({
  imports: [AuthModule, ReportingModule, ProjectsModule],
  controllers: [ExportController, ExportShareController],
  providers: [
    ExportService,
    ExportRowsBuilder,
    ExportPresetService,
    ExportScheduleService,
    ReportShareService
  ],
  exports: [ExportService]
})
export class ExportModule {}
