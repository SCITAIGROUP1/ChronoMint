import {
  changePasswordSchema,
  ErrorCodes,
  ROUTES,
  updateUserPreferencesSchema,
  updateUserProfileSchema
} from "@chronomint/contracts";
import { Body, Controller, Get, HttpStatus, Patch, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { DomainException } from "../../../../common/errors/domain.exception";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { UsersService } from "../../application/users.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get(ROUTES.USERS.ME)
  getMe(@CurrentUser() user: RequestUser) {
    return this.users.getProfile(user.userId, user.workspaceId);
  }

  @Patch(ROUTES.USERS.ME)
  updateMe(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateUserProfileSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    return this.users.updateProfile(
      user.userId,
      user.workspaceId,
      body as Parameters<UsersService["updateProfile"]>[2]
    );
  }

  @Patch(ROUTES.USERS.PREFERENCES)
  updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateUserPreferencesSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    return this.users.updatePreferences(
      user.userId,
      user.workspaceId,
      body as Parameters<UsersService["updatePreferences"]>[2]
    );
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.USERS.PASSWORD)
  changePassword(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: unknown
  ) {
    this.assertNotImpersonating(user);
    return this.users.changePassword(
      user.userId,
      body as Parameters<UsersService["changePassword"]>[1]
    );
  }

  private assertNotImpersonating(user: RequestUser) {
    if (user.impersonatorId) {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Cannot modify account while impersonating",
        HttpStatus.FORBIDDEN
      );
    }
  }
}
