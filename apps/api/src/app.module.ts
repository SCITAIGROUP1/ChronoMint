import { Module } from "@nestjs/common";
import { CacheModule } from "./common/cache/cache.module";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BillingModule } from "./modules/billing/billing.module";
import { ExportModule } from "./modules/export/export.module";
import { HealthModule } from "./modules/health/health.module";
import { PresenceModule } from "./modules/presence/presence.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { ReportingModule } from "./modules/reporting/reporting.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { TimelogsModule } from "./modules/timelogs/timelogs.module";
import { TimerModule } from "./modules/timer/timer.module";
import { WorkspaceModule } from "./modules/workspace/workspace.module";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    CacheModule,
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
