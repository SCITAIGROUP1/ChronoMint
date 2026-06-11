import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AccessModule } from "../../../common/access/access.module";
import { TokenCipherService } from "../../../common/crypto/token-cipher.service";
import { JiraAuthBridgeModule } from "../jira-auth-bridge.module";
import { JiraConfigService } from "./application/jira-config.service";
import { JiraConnectionService } from "./application/jira-connection.service";
import { JiraIssueResolverService } from "./application/jira-issue-resolver.service";
import { JiraProjectMappingService } from "./application/jira-project-mapping.service";
import { JiraApiClient } from "./infrastructure/jira-api.client";
import { JiraController } from "./interface/http/jira.controller";

@Module({
  imports: [
    JiraAuthBridgeModule,
    AccessModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-min-32-chars-long"
    })
  ],
  controllers: [JiraController],
  providers: [
    JiraConfigService,
    JiraConnectionService,
    JiraProjectMappingService,
    JiraIssueResolverService,
    JiraApiClient,
    TokenCipherService
  ],
  exports: [JiraConnectionService, JiraIssueResolverService]
})
export class JiraModule {}
