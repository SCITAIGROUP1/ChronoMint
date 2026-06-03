import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PresenceService } from "./application/presence.service";
import { PresenceController } from "./interface/http/presence.controller";

@Module({
  imports: [AuthModule],
  controllers: [PresenceController],
  providers: [PresenceService]
})
export class PresenceModule {}
