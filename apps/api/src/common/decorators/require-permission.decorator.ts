import type { Permission } from "@kloqra/contracts";
import { SetMetadata } from "@nestjs/common";

export const REQUIRE_PERMISSION_KEY = "authorization:require-permission";

export type PermissionResolverValue =
  | { source: "session"; field: "tenantId" | "workspaceId" }
  | { source: "route"; parameter: string };

export type PermissionResourceResolver =
  | { scope: "platform" }
  | { scope: "tenant"; tenantId: PermissionResolverValue }
  | {
      scope: "workspace";
      workspaceId: PermissionResolverValue;
      expectedTenantId?: PermissionResolverValue;
    }
  | {
      scope: "project";
      projectId: PermissionResolverValue;
      expectedWorkspaceId?: PermissionResolverValue;
      expectedTenantId?: PermissionResolverValue;
    }
  | {
      scope: "self";
      workspaceId?: PermissionResolverValue;
      tenantId?: PermissionResolverValue;
    };

export interface RequiredPermissionMetadata {
  permission: Permission;
  resolver: PermissionResourceResolver;
}

/**
 * Declares the canonical permission and the exact trusted locator mapping for a route.
 * Route IDs are only locators; AuthorizationEnforcementService resolves their ancestry.
 */
export const RequirePermission = (permission: Permission, resolver: PermissionResourceResolver) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, {
    permission,
    resolver
  } satisfies RequiredPermissionMetadata);
