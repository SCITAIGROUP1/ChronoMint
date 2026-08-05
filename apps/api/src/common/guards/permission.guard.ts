import { ErrorCodes } from "@kloqra/contracts";
import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthorizationResourceLocator } from "../access/authorization-enforcement.service";
import { AuthorizationEnforcementService } from "../access/authorization-enforcement.service";
import {
  REQUIRE_PERMISSION_KEY,
  type PermissionResolverValue,
  type PermissionResourceResolver,
  type RequiredPermissionMetadata
} from "../decorators/require-permission.decorator";
import { DomainException } from "../errors/domain.exception";

type PermissionRequest = {
  params?: Record<string, unknown>;
  user?: { userId?: string; tenantId?: string; workspaceId?: string };
  platformUser?: { platformUserId?: string };
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationEnforcementService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<RequiredPermissionMetadata>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!metadata) return true;

    const request = context.switchToHttp().getRequest<PermissionRequest>();
    const principalId = request.user?.userId ?? request.platformUser?.platformUserId;
    if (!principalId) {
      this.deny("authenticated principal is unavailable");
    }

    await this.authorization.assertAllowed({
      principalId,
      permission: metadata.permission,
      resource: this.resolveLocator(metadata.resolver, request)
    });
    return true;
  }

  private resolveLocator(
    resolver: PermissionResourceResolver,
    request: PermissionRequest
  ): AuthorizationResourceLocator {
    switch (resolver.scope) {
      case "platform":
        return { scope: "platform" };
      case "tenant":
        return {
          scope: "tenant",
          tenantId: this.value(resolver.tenantId, request)
        };
      case "workspace":
        return {
          scope: "workspace",
          workspaceId: this.value(resolver.workspaceId, request),
          expectedTenantId: this.optionalValue(resolver.expectedTenantId, request)
        };
      case "project":
        return {
          scope: "project",
          projectId: this.value(resolver.projectId, request),
          expectedWorkspaceId: this.optionalValue(resolver.expectedWorkspaceId, request),
          expectedTenantId: this.optionalValue(resolver.expectedTenantId, request)
        };
      case "self":
        return {
          scope: "self",
          workspaceId: this.optionalValue(resolver.workspaceId, request),
          tenantId: this.optionalValue(resolver.tenantId, request)
        };
    }
  }

  private optionalValue(
    resolver: PermissionResolverValue | undefined,
    request: PermissionRequest
  ): string | undefined {
    return resolver ? this.value(resolver, request) : undefined;
  }

  private value(resolver: PermissionResolverValue, request: PermissionRequest): string {
    const value =
      resolver.source === "session"
        ? request.user?.[resolver.field]
        : request.params?.[resolver.parameter];
    if (typeof value !== "string" || value.length === 0) {
      this.deny("declared authorization resource is unavailable");
    }
    return value;
  }

  private deny(reason: string): never {
    throw new DomainException(
      ErrorCodes.FORBIDDEN,
      "Insufficient permissions",
      HttpStatus.FORBIDDEN,
      { reason }
    );
  }
}
