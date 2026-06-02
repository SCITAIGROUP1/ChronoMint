import { Controller, Get } from "@nestjs/common";
import { ROUTES } from "@chronomint/contracts";

@Controller()
export class HealthController {
  @Get(ROUTES.HEALTH)
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
