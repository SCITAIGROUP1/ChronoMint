import {
  loginSchema,
  registerSchema,
  switchWorkspaceSchema,
  impersonateSchema,
  ROUTES,
  ErrorCodes,
  type AuthSessionDto
} from "@kloqra/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpStatus
} from "@nestjs/common";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { type Response, type Request } from "express";
import { assertAllowedAuthOrigin } from "../../../../common/auth/allowed-origins";
import {
  accessCookieName,
  getAuthScope,
  refreshCookieName
} from "../../../../common/auth/auth-scope";
import { getClearCookieOpts, getCookieOpts } from "../../../../common/auth/cookie-options";
import {
  CurrentUser,
  type RequestUser
} from "../../../../common/decorators/current-user.decorator";
import type { WorkspaceRole } from "@kloqra/contracts";
import { DomainException } from "../../../../common/errors/domain.exception";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { AuthService } from "../../application/auth.service";

function requireProductionAuthScope(req: Request): string {
  const scope = getAuthScope(req);
  if (scope === "client" || scope === "admin") return scope;
  if (process.env.NODE_ENV === "production") {
    throw new DomainException(
      ErrorCodes.UNAUTHORIZED,
      "X-Auth-Scope header required (client or admin)",
      HttpStatus.UNAUTHORIZED
    );
  }
  return scope;
}

function guardCookieAuthRequest(req: Request): void {
  assertAllowedAuthOrigin(req);
  requireProductionAuthScope(req);
}

@Controller()
export class AuthController {
  constructor(private auth: AuthService) {}

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.REGISTER)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    guardCookieAuthRequest(req);
    const session = await this.auth.register(body as Parameters<AuthService["register"]>[0]);
    const accessToken = await this.setCookies(req, res, session);
    return { ...session, accessToken };
  }

  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
  @Post(ROUTES.AUTH.LOGIN)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    guardCookieAuthRequest(req);
    const result = await this.auth.login(body as Parameters<AuthService["login"]>[0]);
    if ("requires2fa" in result && result.requires2fa) {
      return result;
    }
    const session = result as AuthSessionDto;
    const accessToken = await this.setCookies(req, res, session);
    return { ...session, accessToken };
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(ROUTES.AUTH.REFRESH)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    guardCookieAuthRequest(req);
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)] ?? req.cookies?.refresh_token;
    if (!refresh) {
      throw new DomainException(
        ErrorCodes.UNAUTHORIZED,
        "No refresh token provided",
        HttpStatus.UNAUTHORIZED
      );
    }
    const { session, newRefreshToken, family } = await this.auth.rotateRefreshToken(refresh, {
      userAgent: req.headers["user-agent"]
    });
    if (!session) return { error: "No workspace" };

    const tokenScope = scope === "client" || scope === "admin" ? scope : undefined;
    const access = this.auth.signAccessToken(
      session.user.id,
      session.workspaceId,
      session.workspaceRole,
      session.impersonatorId,
      tokenScope,
      family
    );
    const cookieOpts = getCookieOpts();
    res.cookie(accessCookieName(scope), access, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000
    });
    if (newRefreshToken) {
      res.cookie(refreshCookieName(scope), newRefreshToken, {
        ...cookieOpts,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }
    return { ...session, accessToken: access };
  }

  @UseGuards(JwtAuthGuard)
  @Post(ROUTES.AUTH.SWITCH_WORKSPACE)
  async switchWorkspace(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(switchWorkspaceSchema)) body: { workspaceId: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const impersonatorId = user.impersonatorId;
    let impersonatorName: string | undefined;

    if (impersonatorId) {
      const imp = await this.auth.verifyImpersonator(impersonatorId, body.workspaceId);
      impersonatorName = imp.name;
    }

    const session = await this.auth.switchWorkspace(user.userId, body.workspaceId);
    const enrichedSession = {
      ...session,
      impersonatorId,
      impersonatorName
    };

    const accessToken = await this.setCookies(req, res, enrichedSession, impersonatorId);
    return { ...enrichedSession, accessToken };
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get(ROUTES.AUTH.ME)
  me(@CurrentUser() user: RequestUser) {
    return this.auth.getMe(user.userId, user.workspaceId, user.impersonatorId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(ROUTES.AUTH.IMPERSONATE)
  async impersonate(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(impersonateSchema)) body: { userId: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    if (user.role !== "ADMIN") {
      throw new DomainException(
        ErrorCodes.FORBIDDEN,
        "Only workspace administrators can view as another member",
        HttpStatus.FORBIDDEN
      );
    }

    const { session, accessToken, refreshToken } = await this.auth.impersonate(
      user.userId,
      user.workspaceId,
      body.userId
    );

    const clientScope = "client" as const;
    const cookieOpts = getCookieOpts();
    res.cookie(accessCookieName(clientScope), accessToken, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000
    });
    res.cookie(refreshCookieName(clientScope), refreshToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return { ...session, accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post(ROUTES.AUTH.STOP_IMPERSONATION)
  async stopImpersonation(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    guardCookieAuthRequest(req);
    const refresh =
      req.cookies?.[refreshCookieName("client")] ??
      req.cookies?.refresh_token_client ??
      req.cookies?.refresh_token;
    if (refresh) {
      await this.auth.revokeRefreshToken(refresh);
    }
    const clearOpts = getClearCookieOpts();
    res.clearCookie(accessCookieName("client"), clearOpts);
    res.clearCookie(refreshCookieName("client"), clearOpts);
    res.clearCookie("access_token", clearOpts);
    res.clearCookie("refresh_token", clearOpts);
    return { ok: true };
  }

  @Delete(ROUTES.AUTH.LOGOUT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    guardCookieAuthRequest(req);
    const scope = getAuthScope(req);
    const refresh = req.cookies?.[refreshCookieName(scope)] ?? req.cookies?.refresh_token;
    if (refresh) {
      await this.auth.revokeRefreshToken(refresh);
    }
    const clearOpts = getClearCookieOpts();
    res.clearCookie(accessCookieName(scope), clearOpts);
    res.clearCookie(refreshCookieName(scope), clearOpts);
    res.clearCookie("access_token", clearOpts);
    res.clearCookie("refresh_token", clearOpts);
    return { ok: true };
  }

  private sessionMetaFromRequest(req: Request) {
    return {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip || req.socket.remoteAddress
    };
  }

  private async setCookies(
    req: Request,
    res: Response,
    session: { user: { id: string }; workspaceId: string; workspaceRole: WorkspaceRole },
    impersonatorId?: string
  ): Promise<string> {
    const scope = requireProductionAuthScope(req);
    const tokenScope = scope === "client" || scope === "admin" ? scope : undefined;
    const issued = await this.auth.signAndStoreRefreshToken(
      session.user.id,
      session.workspaceId,
      undefined,
      impersonatorId,
      this.sessionMetaFromRequest(req),
      tokenScope
    );
    const access = this.auth.signAccessToken(
      session.user.id,
      session.workspaceId,
      session.workspaceRole,
      impersonatorId,
      tokenScope,
      issued.family
    );
    const cookieOpts = getCookieOpts();
    res.cookie(accessCookieName(scope), access, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000
    });
    res.cookie(refreshCookieName(scope), issued.raw, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return access;
  }
}
