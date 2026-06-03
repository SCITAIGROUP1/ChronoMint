import { ROUTES } from "@chronomint/contracts";
import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get(ROUTES.HEALTH)
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
