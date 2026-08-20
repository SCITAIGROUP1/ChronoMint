import { describe, expect, it } from "vitest";
import {
  earlySubmitDialogCopy,
  formatSubmissionPeriodLabel,
  isOpenTimesheetPeriod,
  openTimesheetPeriodCaption,
  openTimesheetPeriodHint
} from "./submission-period-label.js";

describe("isOpenTimesheetPeriod", () => {
  it("is open when now is before period end", () => {
    expect(
      isOpenTimesheetPeriod("2026-08-23T18:29:59.999Z", new Date("2026-08-20T10:30:00.000Z"))
    ).toBe(true);
  });

  it("is closed when now is after period end", () => {
    expect(
      isOpenTimesheetPeriod("2026-08-16T18:29:59.999Z", new Date("2026-08-20T10:30:00.000Z"))
    ).toBe(false);
  });
});

describe("formatSubmissionPeriodLabel", () => {
  it("formats a Colombo weekly range from UTC instants, not the UTC calendar date", () => {
    // Mon Aug 17 00:00 Colombo → Sun Aug 23 23:59 Colombo
    expect(
      formatSubmissionPeriodLabel(
        "2026-08-16T18:30:00.000Z",
        "weekly",
        "Asia/Colombo",
        "2026-08-23T18:29:59.999Z"
      )
    ).toBe("Aug 17 – Aug 23, 2026");
  });

  it("formats a daily period in the workspace timezone", () => {
    expect(formatSubmissionPeriodLabel("2026-08-19T18:30:00.000Z", "daily", "Asia/Colombo")).toBe(
      "Thu, Aug 20, 2026"
    );
  });

  it("formats a monthly period in the workspace timezone", () => {
    expect(formatSubmissionPeriodLabel("2026-07-31T18:30:00.000Z", "monthly", "Asia/Colombo")).toBe(
      "August 2026"
    );
  });
});

describe("open period copy", () => {
  const nowEnd = "2026-08-23T18:29:59.999Z";

  it("captions weekly end in local time", () => {
    expect(openTimesheetPeriodCaption(nowEnd, "Asia/Colombo")).toBe(
      "In progress · ends Sun, Aug 23"
    );
  });

  it("explains early submit for daily, weekly, and monthly", () => {
    expect(openTimesheetPeriodHint("daily", "2026-08-20T18:29:59.999Z", "Asia/Colombo")).toContain(
      "This day is still in progress"
    );
    expect(openTimesheetPeriodHint("weekly", nowEnd, "Asia/Colombo")).toContain(
      "This week is still in progress"
    );
    expect(
      openTimesheetPeriodHint("monthly", "2026-08-31T18:29:59.999Z", "Asia/Colombo")
    ).toContain("This month is still in progress");
  });

  it("uses period-specific early-submit dialog copy", () => {
    expect(earlySubmitDialogCopy("daily").title).toBe("Submit this day early?");
    expect(earlySubmitDialogCopy("weekly").title).toBe("Submit this week early?");
    expect(earlySubmitDialogCopy("monthly").title).toBe("Submit this month early?");
    expect(earlySubmitDialogCopy("weekly").confirm).toBe("Submit early");
  });
});
