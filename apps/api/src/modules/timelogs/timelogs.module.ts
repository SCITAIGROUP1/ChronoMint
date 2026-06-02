import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TimelogsController } from "./interface/http/timelogs.controller";
import { TimelogsService } from "./application/timelogs.service";

@Module({
  imports: [AuthModule],
  controllers: [TimelogsController],
  providers: [TimelogsService],
  exports: [TimelogsService]
})
export class TimelogsModule {}
