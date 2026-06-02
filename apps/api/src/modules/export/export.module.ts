import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { ReportingModule } from "../reporting/reporting.module";
import { ExportController } from "./interface/http/export.controller";
import { ExportService } from "./application/export.service";

@Module({
  imports: [AuthModule, ReportingModule, ProjectsModule],
  controllers: [ExportController],
  providers: [ExportService]
})
export class ExportModule {}
