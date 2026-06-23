import { ErrorCodes } from "@kloqra/contracts";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import type { RequestUser } from "../decorators/current-user.decorator";

@Injectable()
export class AdminOrProjectLeadGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as RequestUser | undefined;
    if (!user) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: "Insufficient permissions"
      });
    }
    if (user.role === "ADMIN") {
      return true;
    }
    if (user.ledProjectIds && user.ledProjectIds.length > 0) {
      return true;
    }
    throw new ForbiddenException({
      code: ErrorCodes.FORBIDDEN,
      message: "Insufficient permissions"
    });
  }
}
