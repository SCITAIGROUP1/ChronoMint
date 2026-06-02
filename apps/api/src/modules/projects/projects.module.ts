import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsController } from "./interface/http/projects.controller";
import { TeamInvitesController } from "./interface/http/team-invites.controller";
import { ProjectsService } from "./application/projects.service";
import { ProjectAccessService } from "./application/project-access.service";

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController, TeamInvitesController],
  providers: [ProjectsService, ProjectAccessService],
  exports: [ProjectAccessService]
})
export class ProjectsModule {}
