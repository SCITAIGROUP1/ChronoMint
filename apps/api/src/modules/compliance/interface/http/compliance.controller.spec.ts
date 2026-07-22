import { hasManagedRolePermission } from "@kloqra/contracts";
import { describe, expect, it } from "vitest";
import {
  REQUIRE_PERMISSION_KEY,
  type RequiredPermissionMetadata
} from "../../../../common/decorators/require-permission.decorator";
import { ComplianceController } from "./compliance.controller";

const metadata = (method: keyof ComplianceController): RequiredPermissionMetadata =>
  Reflect.getMetadata(REQUIRE_PERMISSION_KEY, ComplianceController.prototype[method] as object);

describe("compliance canonical route authorization", () => {
  it("separates export and import permissions", () => {
    expect(metadata("createExport").permission).toBe("tenant:ExportData");
    expect(metadata("downloadExport").permission).toBe("tenant:ExportData");
    expect(metadata("importData").permission).toBe("tenant:ImportData");
    expect(metadata("getLatestImport").permission).toBe("tenant:ImportData");
  });

  it("keeps compliance data owner-only", () => {
    expect(hasManagedRolePermission("TENANT_OWNER", "tenant:ExportData", "tenant")).toBe(true);
    expect(hasManagedRolePermission("TENANT_OWNER", "tenant:ImportData", "tenant")).toBe(true);
    expect(hasManagedRolePermission("TENANT_ADMIN", "tenant:ExportData", "tenant")).toBe(false);
    expect(hasManagedRolePermission("TENANT_ADMIN", "tenant:ImportData", "tenant")).toBe(false);
  });
});
