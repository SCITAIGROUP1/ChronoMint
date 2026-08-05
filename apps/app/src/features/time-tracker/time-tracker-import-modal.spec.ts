import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notifyImportResult } from "./time-tracker-import-modal";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

describe("notifyImportResult", () => {
  beforeEach(() => vi.clearAllMocks());

  it("treats duplicate rows as a successful no-op", () => {
    notifyImportResult({ created: 0, skipped: 7, failed: [] });
    expect(toast.success).toHaveBeenCalledWith(
      "All 7 entries already exist — nothing new to import."
    );
  });

  it("summarizes mixed personal imports", () => {
    notifyImportResult({ created: 2, skipped: 5, failed: [] });
    expect(toast.success).toHaveBeenCalledWith("Imported 2 · skipped 5 already in your timesheet.");
  });
});
