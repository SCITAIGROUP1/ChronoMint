import { ErrorCodes } from "@kloqra/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { PersonalAccessTokenService } from "../../modules/auth/application/personal-access-token.service";
import { resolveWorkspaceId } from "../auth/resolve-workspace-id";
import { DomainException } from "../errors/domain.exception";
import { JwtAuthGuard } from "./jwt-auth.guard";

const PAT_PREFIX = "klo_pat_";

@Injectable()
export class JwtOrPatAuthGuard implements CanActivate {
  constructor(
    private jwtAuth: JwtAuthGuard,
    private personalAccessTokens: PersonalAccessTokenService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    const bearer =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;

    if (bearer?.startsWith(PAT_PREFIX)) {
      try {
        const session = await this.personalAccessTokens.authenticate(bearer);
        const headerWs = req.headers["x-workspace-id"];
        const headerValue = Array.isArray(headerWs) ? headerWs[0] : headerWs;
        const workspaceId = resolveWorkspaceId(session.workspaceId, headerValue);
        req.user = {
          userId: session.userId,
          workspaceId,
          role: session.role
        };
        return true;
      } catch (err: unknown) {
        if (
          err instanceof UnauthorizedException ||
          err instanceof ForbiddenException ||
          err instanceof DomainException
        ) {
          throw err;
        }
        throw new UnauthorizedException({
          code: ErrorCodes.PERSONAL_ACCESS_TOKEN_INVALID,
          message: "Invalid personal access token"
        });
      }
    }

    return this.jwtAuth.canActivate(context);
  }
}
