import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { TimelogsModule } from "../timelogs/timelogs.module";
import { TimerService } from "./application/timer.service";
import { TimerController } from "./interface/http/timer.controller";

@Module({
  imports: [AuthModule, ProjectsModule, TimelogsModule],
  controllers: [TimerController],
  providers: [TimerService]
})
export class TimerModule {}
