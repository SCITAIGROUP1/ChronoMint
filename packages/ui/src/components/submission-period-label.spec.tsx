import { describe, expect, it } from "vitest";
import {
  formatSubmissionPeriodLabel,
  formatTimesheetSubmittedMessage
} from "./submission-period-label.js";

describe("formatTimesheetSubmittedMessage", () => {
  it("uses #585 AC copy with the formatted period label", () => {
    expect(formatTimesheetSubmittedMessage("2026-06-16T00:00:00.000Z", "weekly")).toBe(
      "Your timesheet for Week of 2026-06-16 has been submitted for approval."
    );
  });

  it("formats daily periods", () => {
    const period = formatSubmissionPeriodLabel("2026-06-16T00:00:00.000Z", "daily");
    expect(formatTimesheetSubmittedMessage("2026-06-16T00:00:00.000Z", "daily")).toBe(
      `Your timesheet for ${period} has been submitted for approval.`
    );
  });
});
