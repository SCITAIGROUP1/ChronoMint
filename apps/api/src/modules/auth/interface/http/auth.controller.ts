import { loginSchema, registerSchema, switchWorkspaceSchema, ROUTES } from "@chronomint/contracts";
import { Body, Controller, Delete, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { type Response, type Request } from "express";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { AuthService } from "../../application/auth.service";

const REFRESH_COOKIE = "refresh_token";
const ACCESS_COOKIE = "access_token";

const cookieSecure = process.env.NODE_ENV === "production";

@Controller()
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post(ROUTES.AUTH.REGISTER)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: unknown,
    @Res({ passthrough: true }) res: Response
  ) {
    const session = await this.auth.register(body as Parameters<AuthService["register"]>[0]);
    this.setCookies(res, session);
    return {
      ...session,
      accessToken: this.auth.signAccessToken(
        session.user.id,
        session.workspaceId,
        session.workspaceRole
      )
    };
  }

  @Post(ROUTES.AUTH.LOGIN)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: unknown,
    @Res({ passthrough: true }) res: Response
  ) {
    const session = await this.auth.login(body as Parameters<AuthService["login"]>[0]);
    this.setCookies(res, session);
    return {
      ...session,
      accessToken: this.auth.signAccessToken(
        session.user.id,
        session.workspaceId,
        session.workspaceRole
      )
    };
  }

  @Post(ROUTES.AUTH.REFRESH)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh = req.cookies?.[REFRESH_COOKIE];
    const { userId } = this.auth.verifyRefresh(refresh);
    const session = await this.auth.refreshSession(userId);
    if (!session) return { error: "No workspace" };
    const access = this.auth.signAccessToken(userId, session.workspaceId, session.workspaceRole);
    res.cookie(ACCESS_COOKIE, access, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure,
      maxAge: 15 * 60 * 1000
    });
    return { ...session, accessToken: access };
  }

  @UseGuards(JwtAuthGuard)
  @Post(ROUTES.AUTH.SWITCH_WORKSPACE)
  async switchWorkspace(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(switchWorkspaceSchema)) body: { workspaceId: string },
    @Res({ passthrough: true }) res: Response
  ) {
    const session = await this.auth.switchWorkspace(user.userId, body.workspaceId);
    this.setCookies(res, session);
    return {
      ...session,
      accessToken: this.auth.signAccessToken(
        session.user.id,
        session.workspaceId,
        session.workspaceRole
      )
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(ROUTES.AUTH.ME)
  me(@CurrentUser() user: RequestUser) {
    return this.auth.getMe(user.userId, user.workspaceId);
  }

  @Delete(ROUTES.AUTH.LOGOUT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_COOKIE);
    res.clearCookie(REFRESH_COOKIE);
    return { ok: true };
  }

  private setCookies(
    res: Response,
    session: { user: { id: string }; workspaceId: string; workspaceRole: "ADMIN" | "MEMBER" }
  ) {
    const access = this.auth.signAccessToken(
      session.user.id,
      session.workspaceId,
      session.workspaceRole
    );
    const refresh = this.auth.signRefreshToken(session.user.id);
    res.cookie(ACCESS_COOKIE, access, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure,
      maxAge: 15 * 60 * 1000
    });
    res.cookie(REFRESH_COOKIE, refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSecure,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }
}
