import { describe, expect, it } from "vitest";
import { persistErrorSurface, persistTaskDraftHint } from "./time-tracker-persist-error";

describe("persistErrorSurface", () => {
  it("keeps dialog overlap and save errors on the modal", () => {
    expect(persistErrorSurface("dialog")).toBe("entryError");
  });

  it("keeps flush-bar errors on the add-entry row", () => {
    expect(persistErrorSurface("quickadd")).toBe("quickAddError");
  });
});

describe("persistTaskDraftHint", () => {
  it("asks only for project and task on the quick-add bar", () => {
    expect(persistTaskDraftHint("quickadd")).toBe("Select a project and a task.");
  });

  it("allows organization time types in the timesheet dialog", () => {
    expect(persistTaskDraftHint("dialog")).toBe(
      "Select a project and a task, or an organization time type."
    );
  });
});
