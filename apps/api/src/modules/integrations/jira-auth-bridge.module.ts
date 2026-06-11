import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";

/** Re-exports AuthModule for nested integration modules (eslint-safe import path). */
@Module({
  imports: [AuthModule],
  exports: [AuthModule]
})
export class JiraAuthBridgeModule {}
