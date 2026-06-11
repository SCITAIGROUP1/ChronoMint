import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthRevocationService } from "../../common/auth/auth-revocation.service";
import { JwtTokenService } from "../../common/auth/jwt-token.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { JwtOrPatAuthGuard } from "../../common/guards/jwt-or-pat-auth.guard";
import { RedisModule } from "../../common/redis/redis.module";
import { AuthService } from "./application/auth.service";
import { PersonalAccessTokenService } from "./application/personal-access-token.service";
import { AuthController } from "./interface/http/auth.controller";
import { PersonalAccessTokensController } from "./interface/http/personal-access-tokens.controller";

@Module({
  imports: [
    RedisModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-min-32-chars-long",
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRES ?? "15m" }
    })
  ],
  controllers: [AuthController, PersonalAccessTokensController],
  providers: [
    AuthService,
    PersonalAccessTokenService,
    JwtTokenService,
    JwtAuthGuard,
    JwtOrPatAuthGuard,
    AuthRevocationService
  ],
  exports: [
    AuthService,
    PersonalAccessTokenService,
    JwtModule,
    JwtTokenService,
    JwtAuthGuard,
    JwtOrPatAuthGuard,
    AuthRevocationService
  ]
})
export class AuthModule {}
