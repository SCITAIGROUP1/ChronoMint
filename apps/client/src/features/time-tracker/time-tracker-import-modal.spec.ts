import { toast } from "sonner";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { notifyImportResult } from "./time-tracker-import-modal";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe("notifyImportResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("explains gracefully when every row already exists", () => {
    notifyImportResult({ created: 0, skipped: 7, failed: [] });
    expect(toast.success).toHaveBeenCalledWith(
      "All 7 entries already exist — nothing new to import."
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("reports a mix of created and skipped without treating skips as failures", () => {
    notifyImportResult({ created: 2, skipped: 5, failed: [] });
    expect(toast.success).toHaveBeenCalledWith("Imported 2 · skipped 5 already in your timesheet.");
  });
});
