import { describe, expect, it } from "vitest";
import { toWorkspaceListItem } from "./to-workspace-list-item";

describe("toWorkspaceListItem", () => {
  it("keeps slim list fields and drops slug/settings", () => {
    expect(
      toWorkspaceListItem({
        id: "11111111-1111-4111-8111-111111111111",
        name: "ABC Workspace",
        slug: "abc-workspace",
        role: "ADMIN",
        settings: { foo: "bar" },
        managedProjectIds: ["22222222-2222-4222-8222-222222222222"]
      })
    ).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "ABC Workspace",
      role: "ADMIN",
      managedProjectIds: ["22222222-2222-4222-8222-222222222222"]
    });
  });

  it("omits managedProjectIds when absent", () => {
    expect(
      toWorkspaceListItem({
        id: "11111111-1111-4111-8111-111111111111",
        name: "ABC Workspace",
        slug: "abc-workspace",
        role: "MEMBER"
      })
    ).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "ABC Workspace",
      role: "MEMBER"
    });
  });
});
