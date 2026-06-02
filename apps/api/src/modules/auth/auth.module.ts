import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./interface/http/auth.controller";
import { AuthService } from "./application/auth.service";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-min-32-chars-long",
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRES ?? "15m" }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule]
})
export class AuthModule {}
