import { hasManagedRolePermission } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import { REQUIRE_PERMISSION_KEY } from "../../../../common/decorators/require-permission.decorator";
import type { RequiredPermissionMetadata } from "../../../../common/decorators/require-permission.decorator";
import { PlatformAuditController } from "./platform-audit.controller";
import { PlatformOperationsControlsController } from "./platform-operations-controls.controller";
import { PlatformOpsController } from "./platform-ops.controller";
import { PlatformPlansController } from "./platform-plans.controller";
import { PlatformSubscriptionsController } from "./platform-subscriptions.controller";
import { PlatformTenantsController } from "./platform-tenants.controller";

const requiredPermission = (
  controller: { prototype: Record<string, unknown> },
  method: string
): RequiredPermissionMetadata =>
  Reflect.getMetadata(REQUIRE_PERMISSION_KEY, controller.prototype[method] as object);

describe("platform canonical route authorization", () => {
  it("allows support read defaults without granting superadmin mutations", () => {
    expect(hasManagedRolePermission("PLATFORM_SUPPORT", "platform:ListTenants", "platform")).toBe(
      true
    );
    expect(
      hasManagedRolePermission("PLATFORM_SUPPORT", "platform:ReadOperations", "platform")
    ).toBe(true);
    expect(
      hasManagedRolePermission("PLATFORM_SUPPORT", "platform:ReadSubscriptions", "platform")
    ).toBe(true);
    expect(hasManagedRolePermission("PLATFORM_SUPPORT", "platform:ManageTenants", "platform")).toBe(
      false
    );
    expect(
      hasManagedRolePermission("PLATFORM_SUPERADMIN", "platform:ManageTenants", "platform")
    ).toBe(true);
  });

  it("maps read routes to support-readable permissions", () => {
    expect(requiredPermission(PlatformTenantsController, "list")).toEqual({
      permission: "platform:ListTenants",
      resolver: { scope: "platform" }
    });
    expect(requiredPermission(PlatformAuditController, "list").permission).toBe(
      "platform:ReadAuditLog"
    );
    expect(requiredPermission(PlatformOpsController, "summary").permission).toBe(
      "platform:ReadOperations"
    );
    expect(requiredPermission(PlatformSubscriptionsController, "detail").permission).toBe(
      "platform:ReadSubscriptions"
    );
    expect(requiredPermission(PlatformPlansController, "list").permission).toBe(
      "platform:ReadPlanCatalog"
    );
  });

  it("keeps queue and tenant-control mutations on exact superadmin permissions", () => {
    expect(
      requiredPermission(PlatformOperationsControlsController, "getFailedJobs").permission
    ).toBe("platform:ReadQueues");
    expect(requiredPermission(PlatformOperationsControlsController, "retryJob").permission).toBe(
      "platform:ManageQueues"
    );
    expect(
      requiredPermission(PlatformOperationsControlsController, "revokeSessions").permission
    ).toBe("platform:ManageTenantSecurity");
    expect(requiredPermission(PlatformOperationsControlsController, "gdprDelete").permission).toBe(
      "platform:DeleteTenantData"
    );
  });
});
