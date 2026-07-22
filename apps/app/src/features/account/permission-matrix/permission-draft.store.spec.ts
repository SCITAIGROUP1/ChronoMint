import { describe, expect, it } from "vitest";
import { usePermissionDraftStore } from "./permission-draft.store";

describe("permission draft store", () => {
  it("tracks, undoes, and discards tri-state changes", () => {
    usePermissionDraftStore.getState().begin("role:WORKSPACE_ADMIN", 4);
    usePermissionDraftStore.getState().set("workspace:ManageMembers", "DENY");
    usePermissionDraftStore.getState().set("workspace:ManageMembers", "INHERIT");

    expect(usePermissionDraftStore.getState().values["workspace:ManageMembers"]).toBe("INHERIT");
    usePermissionDraftStore.getState().undo();
    expect(usePermissionDraftStore.getState().values["workspace:ManageMembers"]).toBe("DENY");
    usePermissionDraftStore.getState().discard();
    expect(usePermissionDraftStore.getState().values).toEqual({});
  });
});
