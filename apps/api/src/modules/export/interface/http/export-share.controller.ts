import { Controller, Get, Param } from "@nestjs/common";
import { ROUTES } from "@chronomint/contracts";
import { ReportShareService } from "../../application/report-share.service";

@Controller()
export class ExportShareController {
  constructor(private reportShares: ReportShareService) {}

  @Get(ROUTES.EXPORT.SHARE(":token"))
  async getShare(@Param("token") token: string) {
    return this.reportShares.getPublicView(token);
  }
}
