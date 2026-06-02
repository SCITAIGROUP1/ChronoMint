import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PresenceController } from "./interface/http/presence.controller";
import { PresenceService } from "./application/presence.service";

@Module({
  imports: [AuthModule],
  controllers: [PresenceController],
  providers: [PresenceService]
})
export class PresenceModule {}
