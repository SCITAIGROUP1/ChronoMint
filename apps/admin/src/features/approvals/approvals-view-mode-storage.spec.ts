/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  LEGACY_APPROVALS_VIEW_MODE_KEY,
  readApprovalsViewMode,
  writeApprovalsViewMode
} from "./approvals-view-mode-storage";

describe("approvals-view-mode-storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("migrates legacy global view mode into a user-scoped key", () => {
    localStorage.setItem(LEGACY_APPROVALS_VIEW_MODE_KEY, "table");
    expect(readApprovalsViewMode("user-a")).toBe("table");
    expect(localStorage.getItem(LEGACY_APPROVALS_VIEW_MODE_KEY)).toBeNull();
  });

  it("keeps view modes isolated per user", () => {
    writeApprovalsViewMode("user-a", "card");
    writeApprovalsViewMode("user-b", "table");
    expect(readApprovalsViewMode("user-a")).toBe("card");
    expect(readApprovalsViewMode("user-b")).toBe("table");
  });
});
