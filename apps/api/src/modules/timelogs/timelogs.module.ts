import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TimelogsService } from "./application/timelogs.service";
import { TimelogsController } from "./interface/http/timelogs.controller";

@Module({
  imports: [AuthModule],
  controllers: [TimelogsController],
  providers: [TimelogsService],
  exports: [TimelogsService]
})
export class TimelogsModule {}
