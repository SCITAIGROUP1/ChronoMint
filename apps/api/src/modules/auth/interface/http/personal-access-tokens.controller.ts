import {
  createPersonalAccessTokenSchema,
  ROUTES,
  type CreatePersonalAccessTokenDto
} from "@kloqra/contracts";
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { PersonalAccessTokenService } from "../../application/personal-access-token.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class PersonalAccessTokensController {
  constructor(private tokens: PersonalAccessTokenService) {}

  @Get(ROUTES.AUTH.PERSONAL_TOKENS)
  list(@CurrentUser() user: RequestUser) {
    return this.tokens.list(user.userId, user.workspaceId);
  }

  @Post(ROUTES.AUTH.PERSONAL_TOKENS)
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createPersonalAccessTokenSchema)) body: CreatePersonalAccessTokenDto
  ) {
    return this.tokens.create(user.userId, user.workspaceId, body);
  }

  @Delete(ROUTES.AUTH.PERSONAL_TOKEN(":id"))
  revoke(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.tokens.revoke(user.userId, user.workspaceId, id);
  }
}
