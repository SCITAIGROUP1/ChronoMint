import { Module } from "@nestjs/common";
import { AuthModule } from "./modules/auth/auth.module";
import { WorkspaceModule } from "./modules/workspace/workspace.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { TimelogsModule } from "./modules/timelogs/timelogs.module";
import { TimerModule } from "./modules/timer/timer.module";
import { BillingModule } from "./modules/billing/billing.module";
import { ReportingModule } from "./modules/reporting/reporting.module";
import { PresenceModule } from "./modules/presence/presence.module";
import { ExportModule } from "./modules/export/export.module";
import { HealthModule } from "./modules/health/health.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    WorkspaceModule,
    ProjectsModule,
    TasksModule,
    TimelogsModule,
    TimerModule,
    BillingModule,
    ReportingModule,
    PresenceModule,
    ExportModule
  ]
})
export class AppModule {}
