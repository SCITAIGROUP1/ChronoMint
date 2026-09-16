import { describe, expect, it } from "vitest";
import {
  calendarLogLabel,
  colorForNonProjectLog,
  entryColorsForLog,
  formatNonProjectHoursPreview,
  NON_PROJECT_ENTRY_COLORS
} from "./non-project-entry-styles";

describe("non-project entry styles", () => {
  it("uses amber for holidays and violet for leave", () => {
    expect(colorForNonProjectLog({ classification: "PUBLIC_HOLIDAY" })).toBe(
      NON_PROJECT_ENTRY_COLORS.PUBLIC_HOLIDAY
    );
    expect(colorForNonProjectLog({ classification: "LEAVE_FULL" })).toBe(
      NON_PROJECT_ENTRY_COLORS.LEAVE_FULL
    );
  });

  it("hatches half-day leave and uses the activity type color", () => {
    const half = entryColorsForLog({ classification: "LEAVE_HALF", taskId: null }, "#111111");
    expect(half.backgroundImage).toContain("repeating-linear-gradient");
    const activity = entryColorsForLog(
      { classification: "TENANT_ACTIVITY", taskId: null, activityTypeColor: "#0891b2" },
      "#111111"
    );
    expect(activity.backgroundColor).toBe("#0891b2");
  });

  it("labels non-project logs from catalog names", () => {
    expect(
      calendarLogLabel(
        {
          classification: "TENANT_ACTIVITY",
          taskId: null,
          activityTypeName: "Office Event",
          holidayName: null,
          description: null
        },
        () => "Task"
      )
    ).toBe("Office Event");
  });

  it("formats duration from daily hours", () => {
    expect(formatNonProjectHoursPreview("LEAVE_FULL", 8)).toBe("8h (full day)");
    expect(formatNonProjectHoursPreview("LEAVE_HALF", 7.5)).toBe("3.75h (half day)");
    expect(formatNonProjectHoursPreview("PROJECT", 8)).toBeNull();
  });
});
