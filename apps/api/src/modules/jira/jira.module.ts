import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { JiraApiService } from "./application/jira-api.service";
import { JiraAuthService } from "./application/jira-auth.service";
import { JiraIssuesService } from "./application/jira-issues.service";
import { JiraProjectsService } from "./application/jira-projects.service";
import { JiraSyncLogService } from "./application/jira-sync-log.service";
import { JiraUsersService } from "./application/jira-users.service";
import { JiraWorklogsService } from "./application/jira-worklogs.service";
import { JiraController } from "./interface/http/jira.controller";

@Module({
  imports: [AuthModule],
  controllers: [JiraController],
  providers: [
    JiraAuthService,
    JiraApiService,
    JiraProjectsService,
    JiraIssuesService,
    JiraUsersService,
    JiraWorklogsService,
    JiraSyncLogService
  ],
  exports: [JiraAuthService, JiraIssuesService]
})
export class JiraModule {}
