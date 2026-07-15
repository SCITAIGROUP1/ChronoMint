import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AccessModule } from "../../common/access/access.module";
import { QUEUES } from "../../common/queues";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { ProjectsService } from "./application/projects.service";
import { ProjectsController } from "./interface/http/projects.controller";
import { TeamInvitesController } from "./interface/http/team-invites.controller";

@Module({
  imports: [
    AuthModule,
    AccessModule,
    NotificationsModule,
    SubscriptionsModule,
    BullModule.registerQueue({ name: QUEUES.BULK_INVITE })
  ],
  controllers: [ProjectsController, TeamInvitesController],
  providers: [ProjectsService],
  exports: [AccessModule]
})
export class ProjectsModule {}
