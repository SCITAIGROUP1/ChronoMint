import { ErrorCodes } from "@chronomint/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { RequestUser } from "../decorators/current-user.decorator";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    const bearer =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;
    const token = bearer || req.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: "Not authenticated"
      });
    }

    try {
      const payload = this.jwt.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET
      }) as RequestUser & { sub: string };
      const headerWs = req.headers["x-workspace-id"];
      const workspaceId = (Array.isArray(headerWs) ? headerWs[0] : headerWs) ?? payload.workspaceId;
      req.user = {
        userId: payload.sub ?? payload.userId,
        workspaceId,
        role: payload.role
      };
      if (!req.user.workspaceId) {
        throw new UnauthorizedException({
          code: ErrorCodes.WORKSPACE_REQUIRED,
          message: "Workspace required"
        });
      }
      return true;
    } catch {
      throw new UnauthorizedException({ code: ErrorCodes.UNAUTHORIZED, message: "Invalid token" });
    }
  }
}
