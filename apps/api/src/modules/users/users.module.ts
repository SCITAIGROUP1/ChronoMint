import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersService } from "./application/users.service";
import { UsersController } from "./interface/http/users.controller";

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
