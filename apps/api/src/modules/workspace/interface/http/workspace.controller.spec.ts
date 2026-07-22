import { describe, expect, it } from "vitest";
import {
  REQUIRE_PERMISSION_KEY,
  type RequiredPermissionMetadata
} from "../../../../common/decorators/require-permission.decorator";
import { WorkspaceController } from "./workspace.controller";

const metadataFor = (method: keyof WorkspaceController) =>
  Reflect.getMetadata(
    REQUIRE_PERMISSION_KEY,
    WorkspaceController.prototype[method]
  ) as RequiredPermissionMetadata;

describe("WorkspaceController canonical authorization", () => {
  it("keeps workspace creation on its explicit tenant delegation path", () => {
    expect(metadataFor("create")).toEqual({
      permission: "tenant:CreateWorkspace",
      resolver: {
        scope: "tenant",
        tenantId: { source: "session", field: "tenantId" }
      }
    });
  });

  it("requires a workspace binding permission for member operations", () => {
    expect(metadataFor("members").permission).toBe("workspace:ListMembers");
    expect(metadataFor("updateMember")).toEqual({
      permission: "workspace:ManageMembers",
      resolver: {
        scope: "workspace",
        workspaceId: { source: "route", parameter: "id" },
        expectedTenantId: { source: "session", field: "tenantId" }
      }
    });
  });

  it("separates workspace settings read and update permissions", () => {
    expect(metadataFor("getById").permission).toBe("workspace:ReadSettings");
    expect(metadataFor("update").permission).toBe("workspace:UpdateSettings");
  });
});
