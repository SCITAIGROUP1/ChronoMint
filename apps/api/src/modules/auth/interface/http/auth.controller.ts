import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { Response, Request } from "express";
import {
  loginSchema,
  registerSchema,
  switchWorkspaceSchema,
  ROUTES
} from "@chronomint/contracts";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { AuthService } from "../../application/auth.service";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { CurrentUser, RequestUser } from "../../../../common/decorators/current-user.decorator";
import { PrismaService } from "../../../../common/prisma/prisma.service";

const REFRESH_COOKIE = "refresh_token";
const ACCESS_COOKIE = "access_token";

@Controller()
export class AuthController {
  constructor(
    private auth: AuthService,
    private prisma: PrismaService
  ) {}

  @Post(ROUTES.AUTH.REGISTER)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: unknown,
    @Res({ passthrough: true }) res: Response
  ) {
    const session = await this.auth.register(body as Parameters<AuthService["register"]>[0]);
    this.setCookies(res, session);
    return { ...session, accessToken: this.auth.signAccessToken(session.user.id, session.workspaceId, session.workspaceRole) };
  }

  @Post(ROUTES.AUTH.LOGIN)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: unknown,
    @Res({ passthrough: true }) res: Response
  ) {
    const session = await this.auth.login(body as Parameters<AuthService["login"]>[0]);
    this.setCookies(res, session);
    return { ...session, accessToken: this.auth.signAccessToken(session.user.id, session.workspaceId, session.workspaceRole) };
  }

  @Post(ROUTES.AUTH.REFRESH)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh = req.cookies?.[REFRESH_COOKIE];
    const { userId } = this.auth.verifyRefresh(refresh);
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      include: { user: true, workspace: true }
    });
    if (!membership) return { error: "No workspace" };
    const session = {
      user: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
        defaultHourlyRate: membership.user.defaultHourlyRate?.toNumber() ?? null
      },
      workspaceId: membership.workspaceId,
      workspaceName: membership.workspace.name,
      workspaceRole: membership.role as "ADMIN" | "MEMBER"
    };
    const access = this.auth.signAccessToken(userId, membership.workspaceId, session.workspaceRole);
    res.cookie(ACCESS_COOKIE, access, { httpOnly: true, sameSite: "lax", secure: false, maxAge: 15 * 60 * 1000 });
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
  async me(@CurrentUser() user: RequestUser) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: user.workspaceId }
    });
    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        defaultHourlyRate: dbUser.defaultHourlyRate?.toNumber() ?? null
      },
      workspaceId: user.workspaceId,
      workspaceName: workspace.name,
      workspaceRole: user.role
    };
  }

  @Delete(ROUTES.AUTH.LOGOUT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_COOKIE);
    res.clearCookie(REFRESH_COOKIE);
    return { ok: true };
  }

  private setCookies(res: Response, session: { user: { id: string }; workspaceId: string; workspaceRole: "ADMIN" | "MEMBER" }) {
    const access = this.auth.signAccessToken(session.user.id, session.workspaceId, session.workspaceRole);
    const refresh = this.auth.signRefreshToken(session.user.id);
    res.cookie(ACCESS_COOKIE, access, { httpOnly: true, sameSite: "lax", secure: false, maxAge: 15 * 60 * 1000 });
    res.cookie(REFRESH_COOKIE, refresh, { httpOnly: true, sameSite: "lax", secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }
}
