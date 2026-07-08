import { describe, expect, it } from "vitest";
import { toDateKey } from "@/features/timesheet/calendar-utils";

/** Mirrors buildScopedQueryKey day normalization used by useMySubmissions. */
function buildScopedQueryKey(anchorDate: Date, scope: "logged" | "assigned") {
  return `date=${toDateKey(anchorDate)}&scope=${scope}`;
}

describe("member submissions query key stability", () => {
  it("uses the same local day key for different times on the same calendar day", () => {
    const morning = new Date(2026, 6, 8, 8, 0, 0);
    const evening = new Date(2026, 6, 8, 20, 15, 30);
    expect(buildScopedQueryKey(morning, "assigned")).toBe(buildScopedQueryKey(evening, "assigned"));
    expect(buildScopedQueryKey(morning, "assigned")).toBe("date=2026-07-08&scope=assigned");
  });

  it("does not shift to the previous UTC day for late evening local times", () => {
    // 2026-07-08 01:00 in +05:30 is still Jul 8 local but Jul 7 in UTC ISO.
    const lateEveningColomboEquiv = new Date(2026, 6, 8, 1, 0, 0);
    expect(buildScopedQueryKey(lateEveningColomboEquiv, "assigned")).toBe(
      "date=2026-07-08&scope=assigned"
    );
  });
});
