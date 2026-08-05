import { hasManagedRolePermission } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  REQUIRE_PERMISSION_KEY,
  type RequiredPermissionMetadata
} from "../../../../common/decorators/require-permission.decorator";
import { TenantsController } from "./tenants.controller";

const metadata = (method: keyof TenantsController): RequiredPermissionMetadata =>
  Reflect.getMetadata(REQUIRE_PERMISSION_KEY, TenantsController.prototype[method] as object);

describe("tenant canonical route authorization", () => {
  it("preserves owner-only billing, member management, export, and import defaults", () => {
    for (const permission of [
      "tenant:ManageBilling",
      "tenant:ManageMembers",
      "tenant:ExportData",
      "tenant:ImportData",
      "tenant:ManageSalesInquiry"
    ] as const) {
      expect(hasManagedRolePermission("TENANT_OWNER", permission, "tenant")).toBe(true);
      expect(hasManagedRolePermission("TENANT_ADMIN", permission, "tenant")).toBe(false);
    }
  });

  it("maps tenant routes to distinct v2 permissions", () => {
    expect(metadata("getSubscription").permission).toBe("tenant:ReadBilling");
    expect(metadata("getRoleGrantAuditLog").permission).toBe("tenant:ReadPermissionAudit");
    expect(metadata("getPermissionMatrix").permission).toBe("tenant:ReadPermissionPolicy");
    expect(metadata("updatePermissionMatrixPolicy").permission).toBe(
      "tenant:ManagePermissionPolicy"
    );
    expect(metadata("listMembers").permission).toBe("tenant:ListMembers");
    expect(metadata("inviteMember").permission).toBe("tenant:ManageMembers");
  });

  it("always resolves tenant authorization from the authenticated session", () => {
    expect(metadata("updateMember").resolver).toEqual({
      scope: "tenant",
      tenantId: { source: "session", field: "tenantId" }
    });
    expect(metadata("assignWorkspaceAdmin").resolver).toEqual({
      scope: "tenant",
      tenantId: { source: "session", field: "tenantId" }
    });
  });
});
