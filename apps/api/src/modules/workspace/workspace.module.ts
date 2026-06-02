import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkspaceController } from "./interface/http/workspace.controller";
import { WorkspaceService } from "./application/workspace.service";

@Module({
  imports: [AuthModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService]
})
export class WorkspaceModule {}
