/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { workspaceListQueryKeys } from "./use-workspace-list-queries";

describe("workspaceListQueryKeys", () => {
  it("builds distinct keys for accessible and tenant workspace lists", () => {
    const ws = "ws-1";
    expect(workspaceListQueryKeys.accessible(ws)).toEqual(["workspace-list", ws, "accessible"]);
    expect(workspaceListQueryKeys.tenant(ws)).toEqual(["workspace-list", ws, "tenant"]);
    expect(workspaceListQueryKeys.accessible(ws)).not.toEqual(workspaceListQueryKeys.tenant(ws));
  });
});
