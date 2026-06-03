import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkspaceService } from "./application/workspace.service";
import { WorkspaceController } from "./interface/http/workspace.controller";

@Module({
  imports: [AuthModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService]
})
export class WorkspaceModule {}
