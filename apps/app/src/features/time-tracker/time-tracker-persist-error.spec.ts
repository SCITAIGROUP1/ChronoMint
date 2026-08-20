import { describe, expect, it } from "vitest";
import { persistErrorSurface } from "./time-tracker-persist-error";

describe("persistErrorSurface", () => {
  it("keeps dialog overlap and save errors on the modal", () => {
    expect(persistErrorSurface("dialog")).toBe("entryError");
  });

  it("keeps flush-bar errors on the add-entry row", () => {
    expect(persistErrorSurface("quickadd")).toBe("quickAddError");
  });
});
